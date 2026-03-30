import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { TimeoutError } from "./timeout-error.js";
import { timeout } from "./timeout.js";

describe("timeout", () => {
	test("throws when used on a field", () => {
		const invalidTimeout: any = timeout(50);

		expect(() => {
			class TestSubject {
				@invalidTimeout
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@timeout is applicable only on methods.");
	});

	test("throws after the provided timeout", async () => {
		const ms = 50;

		class TestSubject {
			@timeout(ms)
			async foo(): Promise<void> {
				await sleep(100);
			}
		}

		const subject = new TestSubject();

		try {
			await subject.foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(error).toBeInstanceOf(TimeoutError);
			expect((error as Error).message).toBe(`timeout occurred after ${ms}`);
		}
	});

	test("returns when the method settles before the timeout", async () => {
		class TestSubject {
			@timeout(100)
			async foo(): Promise<number> {
				await sleep(50);
				return 1;
			}
		}

		const subject = new TestSubject();
		expect(await subject.foo()).toBe(1);
	});

	test("preserves the original rejection when it happens first", async () => {
		class TestSubject {
			@timeout(50)
			async foo(): Promise<void> {
				return Promise.reject(1);
			}
		}

		const subject = new TestSubject();

		try {
			await subject.foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(error).toBe(1);
		}
	});

	test("still times out when the original rejection is too late", async () => {
		class TestSubject {
			@timeout(50)
			async foo(): Promise<void> {
				await sleep(100);
				throw 1;
			}
		}

		const subject = new TestSubject();

		try {
			await subject.foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(error).toBeInstanceOf(TimeoutError);
		}
	});
});
