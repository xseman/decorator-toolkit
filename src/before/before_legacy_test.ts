import {
	describe,
	expect,
	test,
} from "bun:test";
import { before } from "./before_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy before", () => {
	test("calls func before decorated method", () => {
		const calls: string[] = [];

		class Subject {
			foo(): string {
				calls.push("foo");
				return "ok";
			}
		}

		apply(Subject.prototype, "foo", before({ func: () => calls.push("before") }));

		const result = new Subject().foo();
		expect(result).toBe("ok");
		expect(calls).toEqual(["before", "foo"]);
	});

	test("awaits async before func when wait is true", async () => {
		const calls: string[] = [];

		class Subject {
			async foo(): Promise<string> {
				calls.push("foo");
				return "ok";
			}
		}

		apply(
			Subject.prototype,
			"foo",
			before({
				func: async () => {
					await Promise.resolve();
					calls.push("before");
				},
				wait: true,
			}),
		);

		await new Subject().foo();
		expect(calls).toEqual(["before", "foo"]);
	});

	test("throws when used on a non-method", () => {
		expect(() => before({ func: () => {} })({} as object, "x", { value: 42 })).toThrow(
			"@before is applicable only on methods.",
		);
	});
});
