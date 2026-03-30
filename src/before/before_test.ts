import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { before } from "./before.js";

describe("before", () => {
	test("throws when used on a field", () => {
		const invalidBefore: any = before({ func: () => undefined });

		expect(() => {
			class TestSubject {
				@invalidBefore
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@before is applicable only on methods.");
	});

	test("invokes a named hook with the correct context", () => {
		let counter = 0;

		class TestSubject {
			value = 0;

			beforeHook(): void {
				expect(this.value).toBe(3);
				expect(counter).toBe(0);
				counter += 1;
			}

			@before<TestSubject>({ func: "beforeHook" })
			foo(x: number): void {
				this.goo(x);
			}

			goo(x: number): void {
				expect(this.value).toBe(3);
				expect(counter).toBe(1);
				expect(x).toBe(1);
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const gooSpy = spyOn(TestSubject.prototype, "goo");
		const beforeSpy = spyOn(TestSubject.prototype, "beforeHook");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(gooSpy.mock.calls[0]).toEqual([1]);
		expect(beforeSpy.mock.calls).toHaveLength(1);
	});

	test("invokes a provided hook", () => {
		let counter = 0;
		let calls = 0;

		const beforeFunc = (): void => {
			expect(counter).toBe(0);
			counter += 1;
			calls += 1;
		};

		class TestSubject {
			@before<TestSubject>({ func: beforeFunc })
			foo(x: number): void {
				this.goo(x);
			}

			goo(x: number): void {
				expect(counter).toBe(1);
				expect(x).toBe(1);
			}
		}

		const subject = new TestSubject();
		const gooSpy = spyOn(TestSubject.prototype, "goo");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(calls).toBe(1);
	});

	test("does not wait for async hooks by default", async () => {
		let counter = 0;
		let hookCalls = 0;

		const beforeFunc = async (): Promise<void> => {
			hookCalls += 1;
			await sleep(0);
			expect(counter).toBe(1);
		};

		class TestSubject {
			@before<TestSubject>({ func: beforeFunc })
			foo(): void {
				this.goo();
			}

			goo(): void {
				expect(counter).toBe(0);
				counter += 1;
			}
		}

		new TestSubject().foo();
		await sleep(10);
		expect(hookCalls).toBe(1);
		expect(counter).toBe(1);
	});

	test("waits for async hooks when configured", async () => {
		let counter = 0;

		const beforeFunc = async (): Promise<void> => {
			expect(counter).toBe(0);
			await sleep(10);
			counter += 1;
		};

		class TestSubject {
			@before<TestSubject>({
				func: beforeFunc,
				wait: true,
			})
			foo(x: number): number {
				return this.goo(x);
			}

			goo(x: number): number {
				expect(counter).toBe(1);
				return x;
			}
		}

		const result = await new TestSubject().foo(1);
		expect(result).toBe(1);
	});

	test("returns the original method result", async () => {
		let counter = 0;

		const beforeFunc = (): void => {
			expect(counter).toBe(0);
			counter += 1;
		};

		class TestSubject {
			@before<TestSubject>({ func: beforeFunc })
			foo(x: number): number {
				return x;
			}
		}

		const result = await new TestSubject().foo(42);
		expect(result).toBe(42);
	});
});
