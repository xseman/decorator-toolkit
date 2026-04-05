import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { refreshable } from "./refreshable_legacy.js";

function applyAccessor(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy refreshable", () => {
	test("throws when used on a method", () => {
		class Subject {
			fetch(): string {
				return "x";
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "fetch")!;

		expect(() =>
			refreshable({ dataProvider: async () => "x", intervalMs: 20 })(
				Subject.prototype,
				"fetch",
				desc,
			)
		).toThrow("@refreshable is applicable only on accessors.");
	});

	test("starts auto-refresh on first get access", async () => {
		let fetchCount = 0;

		class Feed {
			private _data: string | null = null;

			get data(): string | null {
				return this._data;
			}

			set data(v: string | null) {
				this._data = v;
			}

			async fetchData(): Promise<string> {
				fetchCount += 1;
				return `item-${fetchCount}`;
			}
		}

		applyAccessor(Feed.prototype, "data", refreshable({ dataProvider: "fetchData", intervalMs: 30 }));

		const f = new Feed();
		f.data;
		await sleep(20);
		expect(fetchCount).toBeGreaterThanOrEqual(1);
		expect(f.data).toBeTruthy();
	});

	test("stops interval when set to null", async () => {
		let fetchCount = 0;

		class Feed {
			private _data: string | null = null;

			get data(): string | null {
				return this._data;
			}

			set data(v: string | null) {
				this._data = v;
			}

			async fetchData(): Promise<string> {
				fetchCount += 1;
				return "x";
			}
		}

		applyAccessor(Feed.prototype, "data", refreshable({ dataProvider: "fetchData", intervalMs: 20 }));

		const f = new Feed();
		f.data;
		await sleep(25);
		const countBefore = fetchCount;
		f.data = null;
		await sleep(40);
		expect(fetchCount).toBe(countBefore);
	});
});
