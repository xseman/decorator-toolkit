import {
	describe,
	expect,
	test,
} from "bun:test";
import { multiDispatch } from "./multi-dispatch_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy multiDispatch", () => {
	test("resolves on first success", async () => {
		let attempt = 0;

		class Subject {
			async fetch(): Promise<string> {
				attempt += 1;
				if (attempt < 3) {
					return Promise.reject(new Error("fail"));
				}

				return "ok";
			}
		}

		apply(Subject.prototype, "fetch", multiDispatch(3));

		expect(await new Subject().fetch()).toBe("ok");
	});

	test("rejects when all dispatches fail", async () => {
		class Subject {
			async fetch(): Promise<string> {
				return Promise.reject(new Error("always fails"));
			}
		}

		apply(Subject.prototype, "fetch", multiDispatch(2));

		await expect(new Subject().fetch()).rejects.toThrow("always fails");
	});
});
