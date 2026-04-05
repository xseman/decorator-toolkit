import {
	describe,
	expect,
	test,
} from "bun:test";
import { after } from "./after_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy after", () => {
	test("calls func after decorated method", () => {
		const calls: string[] = [];

		class Subject {
			foo(): string {
				calls.push("foo");
				return "result";
			}
		}

		apply(Subject.prototype, "foo", after({ func: () => calls.push("after") }));

		const s = new Subject();
		const result = s.foo();
		expect(result).toBe("result");
		expect(calls).toEqual(["foo", "after"]);
	});

	test("receives response and args in AfterParams", () => {
		let received: unknown;

		class Subject {
			double(n: number): string {
				return String(n * 2);
			}
		}

		apply(
			Subject.prototype,
			"double",
			after<Subject, string, [number]>({
				func: (params) => {
					received = params;
				},
			}),
		);

		new Subject().double(5);
		expect(received).toEqual({ args: [5], response: "10" });
	});

	test("throws when used on a non-method", () => {
		expect(() => after({ func: () => {} })({} as object, "x", { value: 42 })).toThrow(
			"@after is applicable only on methods.",
		);
	});
});
