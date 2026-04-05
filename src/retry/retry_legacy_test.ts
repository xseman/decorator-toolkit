import {
	describe,
	expect,
	test,
} from "bun:test";
import { retry } from "./retry_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy retry", () => {
	test("retries and eventually succeeds", async () => {
		class Subject {
			counter = 0;

			async fetch(): Promise<string> {
				if (this.counter === 0) {
					this.counter += 1;
					return Promise.reject(new Error("fail"));
				}

				return "ok";
			}
		}

		apply(Subject.prototype, "fetch", retry({ retries: 2, delay: 10 }));

		const s = new Subject();
		expect(await s.fetch()).toBe("ok");
		expect(s.counter).toBe(1);
	});

	test("throws after exhausting retries", async () => {
		class Subject {
			async fetch(): Promise<string> {
				return Promise.reject(new Error("always fails"));
			}
		}

		apply(Subject.prototype, "fetch", retry({ retries: 2, delay: 10 }));

		await expect(new Subject().fetch()).rejects.toThrow("always fails");
	});

	test("accepts array of delays", async () => {
		let calls = 0;

		class Subject {
			async fetch(): Promise<string> {
				calls += 1;
				if (calls < 3) return Promise.reject(new Error("not yet"));
				return "done";
			}
		}

		apply(Subject.prototype, "fetch", retry([10, 10]));

		expect(await new Subject().fetch()).toBe("done");
		expect(calls).toBe(3);
	});
});
