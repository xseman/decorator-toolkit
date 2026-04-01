import {
	describe,
	expect,
	test,
} from "bun:test";

import { bindAll } from "./bind-all.js";

describe("bindAll", () => {
	test("throws when used on a method", () => {
		const invalidBindAll: any = bindAll;

		expect(() => {
			class TestSubject {
				@invalidBindAll
				foo(): void {
				}
			}

			return TestSubject;
		}).toThrow("@bindAll is applicable only on classes.");
	});

	test("binds detached instance methods declared on the class", () => {
		@bindAll
		class TestSubject {
			constructor(private readonly _value: number) {}

			foo(): number {
				return this._value;
			}

			bar(): number {
				return this._value * 2;
			}
		}

		const subject = new TestSubject(4);
		const foo = subject.foo;
		const bar = subject.bar;

		expect(foo()).toBe(4);
		expect(bar()).toBe(8);
		expect(foo).toBe(subject.foo);
		expect(foo).not.toBe(TestSubject.prototype.foo);
	});

	test("keeps bound methods isolated per instance", () => {
		@bindAll()
		class TestSubject {
			constructor(private readonly _value: number) {}

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

	test("binds symbol-named methods", () => {
		const foo = Symbol("foo");

		@bindAll()
		class TestSubject {
			value = 5;

			[foo](): number {
				return this.value;
			}
		}

		const subject = new TestSubject();
		const detached = subject[foo];

		expect(detached()).toBe(5);
	});
});
