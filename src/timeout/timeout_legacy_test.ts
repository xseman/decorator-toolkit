import {
	describe,
	expect,
	test,
} from "bun:test";
import {
	timeout,
	TimeoutError,
} from "./timeout_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy timeout", () => {
	test("resolves when within time limit", async () => {
		class Subject {
			async fetch(): Promise<string> {
				await new Promise((res) => setTimeout(res, 10));
				return "ok";
			}
		}

		apply(Subject.prototype, "fetch", timeout(100));

		expect(await new Subject().fetch()).toBe("ok");
	});

	test("rejects with TimeoutError when exceeded", async () => {
		class Subject {
			async fetch(): Promise<string> {
				await new Promise((res) => setTimeout(res, 100));
				return "too late";
			}
		}

		apply(Subject.prototype, "fetch", timeout(10));

		await expect(new Subject().fetch()).rejects.toBeInstanceOf(TimeoutError);
	});
});
