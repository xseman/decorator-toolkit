import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { cancelPrevious } from "./cancel-previous.js";
import { CanceledPromise } from "./canceled-promise.js";

describe("cancelPrevious", () => {
	test("throws when used on a field", () => {
		const invalidCancelPrevious: any = cancelPrevious;

		expect(() => {
			class TestSubject {
				@invalidCancelPrevious
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@cancelPrevious is applicable only on methods.");
	});

	test("cancels the previous invocation", async () => {
		class TestSubject {
			@cancelPrevious
			foo(x: number): Promise<number> {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve(x);
					}, 10);
				});
			}
		}

		const subject = new TestSubject();
		let canceledCount = 0;

		const first = subject.foo(10).catch((error) => {
			expect(error).toBeInstanceOf(CanceledPromise);
			expect((error as Error).message).toBe("canceled");
			canceledCount += 1;
			return -1;
		});

		await sleep(5);
		const second = subject.foo(100);

		expect(await second).toBe(100);
		await first;
		expect(canceledCount).toBe(1);
	});

	test("does not cancel when the previous invocation already settled", async () => {
		class TestSubject {
			@cancelPrevious()
			foo(x: number): Promise<number> {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve(x);
					}, 10);
				});
			}
		}

		const subject = new TestSubject();
		const first = subject.foo(10);
		await sleep(15);
		const second = subject.foo(100);

		expect(await first).toBe(10);
		expect(await second).toBe(100);
	});

	test("propagates the original rejection", async () => {
		class TestSubject {
			@cancelPrevious()
			foo(): Promise<number> {
				return new Promise((_resolve, reject) => {
					setTimeout(() => {
						reject(new Error("server error"));
					}, 10);
				});
			}
		}

		try {
			await new TestSubject().foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(error).not.toBeInstanceOf(CanceledPromise);
			expect((error as Error).message).toBe("server error");
		}
	});

	test("keeps cancellation state isolated per instance", async () => {
		class TestSubject {
			@cancelPrevious()
			foo(x: number): Promise<number> {
				return new Promise((resolve) => {
					setTimeout(() => {
						resolve(x);
					}, 10);
				});
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		const firstCall = first.foo(1);
		const secondCall = second.foo(2);

		expect(await firstCall).toBe(1);
		expect(await secondCall).toBe(2);
	});
});
