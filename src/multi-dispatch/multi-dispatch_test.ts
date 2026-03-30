import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { multiDispatch } from "./multi-dispatch.js";

describe("multiDispatch", () => {
	test("throws when used on a field", () => {
		const invalidMultiDispatch: any = multiDispatch(50);

		expect(() => {
			class TestSubject {
				@invalidMultiDispatch
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@multiDispatch is applicable only on methods.");
	});

	test("dispatches twice and resolves on the successful call", async () => {
		class TestSubject {
			counter = 0;

			@multiDispatch(2)
			foo(): Promise<string> {
				this.counter += 1;
				if (this.counter === 1) {
					return Promise.reject(new Error("no"));
				}

				return Promise.resolve("yes");
			}
		}

		const subject = new TestSubject();
		expect(await subject.foo()).toBe("yes");
		expect(subject.counter).toBe(2);
	});

	test("rejects with the last error when all calls fail", async () => {
		class TestSubject {
			counter = 0;

			@multiDispatch(2)
			async foo(): Promise<string> {
				this.counter += 1;

				if (this.counter === 1) {
					await sleep(100);
					throw new Error("slowest");
				}

				await sleep(50);
				throw new Error("fastest");
			}
		}

		const subject = new TestSubject();
		try {
			await subject.foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(subject.counter).toBe(2);
			expect((error as Error).message).toBe("slowest");
		}
	});

	test("returns the faster successful result", async () => {
		class TestSubject {
			counter = 0;

			@multiDispatch(2)
			async foo(): Promise<string> {
				this.counter += 1;

				if (this.counter === 1) {
					await sleep(100);
					return "slow";
				}

				await sleep(50);
				return "fast";
			}
		}

		const subject = new TestSubject();
		expect(await subject.foo()).toBe("fast");
		expect(subject.counter).toBe(2);
	});
});
