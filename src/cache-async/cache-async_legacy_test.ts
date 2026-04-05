import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { cacheAsync } from "./cache-async_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy cacheAsync", () => {
	test("caches async results (factory)", async () => {
		class Subject {
			calls = 0;

			async fetch(x: number): Promise<number> {
				this.calls += 1;
				return x * 2;
			}
		}

		apply(Subject.prototype, "fetch", cacheAsync({ ttlMs: 50 }));

		const s = new Subject();
		expect(await s.fetch(3)).toBe(6);
		expect(await s.fetch(3)).toBe(6);
		expect(s.calls).toBe(1);
	});

	test("caches async results (bare — direct call with descriptor)", async () => {
		class Subject {
			calls = 0;

			async fetch(): Promise<number> {
				this.calls += 1;
				return 42;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "fetch")!;
		const result = (cacheAsync as any)(Subject.prototype, "fetch", desc);
		if (result) Object.defineProperty(Subject.prototype, "fetch", result);

		const s = new Subject();
		await s.fetch();
		await s.fetch();
		expect(s.calls).toBe(1);
	});

	test("expires cache after ttl", async () => {
		class Subject {
			calls = 0;

			async fetch(): Promise<number> {
				this.calls += 1;
				return 1;
			}
		}

		apply(Subject.prototype, "fetch", cacheAsync(20));

		const s = new Subject();
		await s.fetch();
		await s.fetch();
		expect(s.calls).toBe(1);
		await sleep(30);
		await s.fetch();
		expect(s.calls).toBe(2);
	});
});
