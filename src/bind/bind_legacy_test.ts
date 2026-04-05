import {
	describe,
	expect,
	test,
} from "bun:test";
import { bind } from "./bind_legacy.js";

function applyMethod(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy bind", () => {
	test("binds method to instance (bare form via direct call)", () => {
		class Subject {
			value = 42;

			getValue(): number {
				return this.value;
			}
		}

		applyMethod(Subject.prototype, "getValue", bind as unknown as MethodDecorator);

		const s = new Subject();
		const { getValue } = s;
		expect(getValue()).toBe(42);
	});

	test("binds method to instance (factory form)", () => {
		class Subject {
			value = 99;

			getValue(): number {
				return this.value;
			}
		}

		applyMethod(Subject.prototype, "getValue", bind() as MethodDecorator);

		const s = new Subject();
		const { getValue } = s;
		expect(getValue()).toBe(99);
	});

	test("caches the bound function on the instance", () => {
		class Subject {
			foo(): void {}
		}

		applyMethod(Subject.prototype, "foo", bind as unknown as MethodDecorator);

		const s = new Subject();
		expect(s.foo).toBe(s.foo);
	});

	test("throws when used on a non-method", () => {
		expect(() => (bind as any)({} as object, "x", { value: 42 })).toThrow("@bind is applicable only on methods.");
	});
});
