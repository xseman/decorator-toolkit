import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { onError } from "./on-error.js";

describe("onError", () => {
	test("throws when used on a field", () => {
		const invalidOnError: any = onError({ func: () => undefined });

		expect(() => {
			class TestSubject {
				@invalidOnError
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@onError is applicable only on methods.");
	});

	test("invokes a named handler for sync errors", () => {
		class TestSubject {
			value = 3;

			@onError<TestSubject, void, [number]>({ func: "handleError" })
			foo(x: number): void {
				this.goo(x);
			}

			goo(_x: number): void {
				throw new Error("arr");
			}

			handleError(error: Error, args: [number]): void {
				expect(error.message).toBe("arr");
				expect(args).toEqual([1]);
				expect(this.value).toBe(3);
			}
		}

		const subject = new TestSubject();
		const gooSpy = spyOn(TestSubject.prototype, "goo");
		const handlerSpy = spyOn(TestSubject.prototype, "handleError");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(handlerSpy.mock.calls).toHaveLength(1);
	});

	test("invokes a provided handler for sync errors", () => {
		const captured: Array<{ message: string; args: [number]; }> = [];

		const handler = (error: Error, args: [number]): void => {
			captured.push({
				message: error.message,
				args,
			});
		};

		class TestSubject {
			@onError<TestSubject, void, [number]>({ func: handler })
			foo(x: number): void {
				this.goo(x);
			}

			goo(_x: number): void {
				throw new Error("arr");
			}
		}

		const subject = new TestSubject();
		const gooSpy = spyOn(TestSubject.prototype, "goo");

		subject.foo(1);
		expect(gooSpy.mock.calls).toHaveLength(1);
		expect(captured).toEqual([{ message: "arr", args: [1] }]);
	});

	test("supports async handlers", async () => {
		const captured: Array<{ message: string; args: [number]; }> = [];

		const handler = async (error: Error, args: [number]): Promise<void> => {
			captured.push({
				message: error.message,
				args,
			});
		};

		class TestSubject {
			@onError<TestSubject, Promise<void>, [number]>({ func: handler })
			foo(_x: number): Promise<void> {
				return Promise.reject(new Error("error"));
			}
		}

		await new TestSubject().foo(1);
		expect(captured).toEqual([{ message: "error", args: [1] }]);
	});

	test("does not invoke the handler when no error occurs", async () => {
		let calls = 0;

		const handler = async (): Promise<void> => {
			calls += 1;
		};

		class TestSubject {
			@onError<TestSubject, Promise<void>>({ func: handler })
			foo(): Promise<void> {
				return Promise.resolve();
			}
		}

		await new TestSubject().foo();
		expect(calls).toBe(0);
	});

	test("supports sync methods with async error handlers", async () => {
		let calls = 0;

		const handler = async (error: Error, args: [number]): Promise<void> => {
			expect(error.message).toBe("arr");
			expect(args).toEqual([1]);
			calls += 1;
		};

		class TestSubject {
			@onError<TestSubject, void, [number]>({ func: handler })
			foo(_x: number): void {
				throw new Error("arr");
			}
		}

		await new TestSubject().foo(1);
		expect(calls).toBe(1);
	});
});
