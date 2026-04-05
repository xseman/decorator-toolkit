import {
	describe,
	expect,
	test,
} from "bun:test";
import { onError } from "./on-error_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy onError", () => {
	test("handles sync errors with provided handler", () => {
		class Subject {
			compute(): string {
				throw new Error("boom");
			}
		}

		apply(Subject.prototype, "compute", onError({ func: (_err, _args) => "fallback" }));

		expect(new Subject().compute()).toBe("fallback");
	});

	test("handles async errors with provided handler", async () => {
		class Subject {
			async fetch(): Promise<string> {
				return Promise.reject(new Error("boom"));
			}
		}

		apply(Subject.prototype, "fetch", onError({ func: async (_err) => "async-fallback" }));

		expect(await new Subject().fetch()).toBe("async-fallback");
	});

	test("does not intercept when no error", () => {
		class Subject {
			compute(): string {
				return "ok";
			}
		}

		apply(Subject.prototype, "compute", onError({ func: () => "should not be called" }));

		expect(new Subject().compute()).toBe("ok");
	});
});
