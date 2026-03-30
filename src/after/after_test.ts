import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	after,
	type AfterFunc,
	type AfterParams,
} from "./after.js";

describe("after", () => {
	test("throws when used on a field", () => {
		const invalidAfter: any = after({ func: () => undefined });

		expect(() => {
			class TestSubject {
				@invalidAfter
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@after is applicable only on methods.");
	});

	test("invokes a named hook with the correct context", () => {
		let counter = 0;

		class TestSubject {
			value = 0;

			afterHook(): void {
				expect(this.value).toBe(3);
				expect(counter).toBe(1);
			}

			@after<TestSubject, void, [number]>({ func: "afterHook" })
			foo(x: number): void {
				this.goo(x);
			}

			goo(x: number): void {
				expect(this.value).toBe(3);
				expect(x).toBe(1);
				expect(counter).toBe(0);
				counter += 1;
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const gooSpy = spyOn(TestSubject.prototype, "goo");
		const afterSpy = spyOn(TestSubject.prototype, "afterHook");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(gooSpy.mock.calls[0]).toEqual([1]);
		expect(afterSpy.mock.calls).toHaveLength(1);
	});

	test("invokes a provided function", () => {
		let counter = 0;
		let calls = 0;

		const afterFunc = (): void => {
			expect(counter).toBe(1);
			calls += 1;
		};

		class TestSubject {
			@after<TestSubject, void, [number]>({ func: afterFunc })
			foo(x: number): void {
				this.goo(x);
			}

			goo(x: number): void {
				expect(x).toBe(1);
				expect(counter).toBe(0);
				counter += 1;
			}
		}

		const subject = new TestSubject();
		const gooSpy = spyOn(TestSubject.prototype, "goo");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(calls).toBe(1);
	});

	test("does not wait for async methods by default", async () => {
		let counter = 0;
		let afterCalls = 0;

		const afterFunc = (): void => {
			expect(counter).toBe(1);
			counter += 1;
			afterCalls += 1;
		};

		class TestSubject {
			@after<TestSubject, Promise<void>, []>({ func: afterFunc })
			foo(): Promise<void> {
				expect(counter).toBe(0);
				counter += 1;

				return new Promise((resolve) => {
					setTimeout(() => {
						expect(counter).toBe(2);
						resolve();
					}, 0);
				});
			}
		}

		const subject = new TestSubject();
		await subject.foo();
		expect(afterCalls).toBe(1);
	});

	test("waits for promise resolution when configured", async () => {
		let counter = 0;
		let afterCalls = 0;

		const afterFunc = (): void => {
			expect(counter).toBe(2);
			afterCalls += 1;
		};

		class TestSubject {
			@after<TestSubject, void, []>({
				func: afterFunc,
				wait: true,
			})
			foo(): Promise<void> {
				expect(counter).toBe(0);
				counter += 1;

				return new Promise((resolve) => {
					setTimeout(() => {
						expect(counter).toBe(1);
						counter += 1;
						resolve();
					}, 0);
				});
			}
		}

		const subject = new TestSubject();
		await subject.foo();
		expect(afterCalls).toBe(1);
	});

	test("provides args and response for sync methods", () => {
		const afterFunc: AfterFunc<number, [number, number]> = (params: AfterParams<number, [number, number]>): void => {
			expect(params.args).toEqual([5, 6]);
			expect(params.response).toBe(11);
		};

		class TestSubject {
			@after<TestSubject, number, [number, number]>({ func: afterFunc })
			foo(x: number, y: number): number {
				return x + y;
			}
		}

		new TestSubject().foo(5, 6);
	});

	test("provides resolved response for async methods when waiting", async () => {
		const afterFunc: AfterFunc<number, [number, number]> = (params: AfterParams<number, [number, number]>): void => {
			expect(params.args).toEqual([5, 6]);
			expect(params.response).toBe(11);
		};

		class TestSubject {
			@after<TestSubject, number, [number, number]>({
				func: afterFunc,
				wait: true,
			})
			foo(x: number, y: number): Promise<number> {
				return Promise.resolve(x + y);
			}
		}

		const result = await new TestSubject().foo(5, 6);
		expect(result).toBe(11);
	});

	test("returns the original method result", async () => {
		const afterFunc = (params: AfterParams<number, [number]>): void => {
			expect(params.response).toBe(42);
		};

		class TestSubject {
			@after<TestSubject, number, [number]>({ func: afterFunc })
			foo(x: number): number {
				return x;
			}
		}

		const result = await new TestSubject().foo(42);
		expect(result).toBe(42);
	});
});
