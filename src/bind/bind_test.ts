import {
	describe,
	expect,
	test,
} from "bun:test";

import { bind } from "./bind.js";

describe("bind", () => {
	test("throws when used on a field", () => {
		const invalidBind: any = bind;

		expect(() => {
			class TestSubject {
				@invalidBind
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@bind is applicable only on methods.");
	});

	test("throws when used on a private method", () => {
		const invalidBind: any = bind();

		expect(() => {
			class TestSubject {
				@invalidBind
				#foo(): string {
					return "nope";
				}
			}

			return TestSubject;
		}).toThrow("@bind does not support private hash methods.");
	});

	test("binds detached instance methods", () => {
		class TestSubject {
			constructor(private readonly _value: number) {}

			@bind
			foo(): number {
				return this._value;
			}
		}

		const subject = new TestSubject(3);
		const detached = subject.foo;

		expect(detached()).toBe(3);
		expect(detached).toBe(subject.foo);
		expect(detached).not.toBe(TestSubject.prototype.foo);
	});

	test("keeps bound methods isolated per instance", () => {
		class TestSubject {
			constructor(private readonly _value: number) {}

			@bind()
			foo(): number {
				return this._value;
			}
		}

		const first = new TestSubject(1);
		const second = new TestSubject(2);

		expect(first.foo()).toBe(1);
		expect(second.foo()).toBe(2);
		expect(first.foo).not.toBe(second.foo);
	});

	test("binds detached static methods", () => {
		class Example {
			static value = 7;

			@bind()
			static foo(): number {
				return this.value;
			}
		}

		const detached = Example.foo;

		expect(detached()).toBe(7);
		expect(detached).toBe(Example.foo);
	});

	test("binds the final method when stacked above another decorator", () => {
		const calls: string[] = [];

		function trace<This, Args extends unknown[] = unknown[], Return = unknown>(
			value: (this: This, ...args: Args) => Return,
			context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
		): (this: This, ...args: Args) => Return {
			return function(this: This, ...args: Args): Return {
				calls.push(String(context.name));
				return value.apply(this, args);
			};
		}

		class TestSubject {
			constructor(private readonly value: number) {}

			@bind
			@trace
			foo(): number {
				return this.value;
			}
		}

		const subject = new TestSubject(9);
		const detached = subject.foo;

		expect(detached()).toBe(9);
		expect(calls).toEqual(["foo"]);
	});
});
