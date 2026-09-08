import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { retry } from "./retry.js";

describe("retry", () => {
	test("throws when used on a field", () => {
		const invalidRetry: any = retry(50);

		expect(() => {
			class TestSubject {
				@invalidRetry
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@retry is applicable only on methods.");
	});

	test("retries and eventually succeeds", async () => {
		class TestSubject {
			counter = 0;

			@retry<TestSubject>({ retries: 2, delay: 10 })
			foo(): Promise<string> {
				if (this.counter === 0) {
					this.counter += 1;
					return Promise.reject(new Error("no"));
				}

				return Promise.resolve("yes");
			}
		}

		const subject = new TestSubject();
		const result = await subject.foo();
		expect(subject.counter).toBe(1);
		expect(result).toBe("yes");
	});

	test("throws after exhausting retries", async () => {
		class TestSubject {
			counter = 0;

			@retry<TestSubject>({ retries: 2, delay: 10 })
			foo(): Promise<string> {
				this.counter += 1;
				return Promise.reject(new Error("no"));
			}
		}

		const subject = new TestSubject();

		try {
			await subject.foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect(subject.counter).toBe(3);
			expect((error as Error).message).toBe("no");
		}
	});

	test("waits according to configured delay", async () => {
		class TestSubject {
			counter = 0;

			@retry<TestSubject>({ retries: 2, delay: 50 })
			foo(): Promise<string> {
				this.counter += 1;
				if (this.counter < 3) {
					return Promise.reject(new Error("no"));
				}

				return Promise.resolve("yes");
			}
		}

		const subject = new TestSubject();
		void subject.foo();
		await sleep(25);
		expect(subject.counter).toBe(1);
		await sleep(50);
		expect(subject.counter).toBe(2);
		await sleep(75);
		expect(subject.counter).toBe(3);
	});

	test("uses the default 1000ms delay for numeric retry input", async () => {
		class TestSubject {
			counter = 0;

			@retry(1)
			foo(): Promise<string> {
				this.counter += 1;
				if (this.counter === 1) {
					return Promise.reject(new Error("no"));
				}

				return Promise.resolve("yes");
			}
		}

		const subject = new TestSubject();
		const promise = subject.foo();
		await sleep(500);
		expect(subject.counter).toBe(1);
		await sleep(600);
		expect(subject.counter).toBe(2);
		expect(await promise).toBe("yes");
	});

	test("throws for invalid retry input", () => {
		expect(() => {
			retry("invalid" as never);
		}).toThrow("invalid input");
	});

	test("invokes onRetry handlers", async () => {
		const errors: string[] = [];
		const counts: number[] = [];

		const onRetry = (error: Error, count: number): void => {
			errors.push(error.message);
			counts.push(count);
		};

		class TestSubject {
			counter = 0;
			decoratedCounter = 0;

			@retry<TestSubject>({ retries: 3, delay: 10, onRetry })
			foo(): Promise<string> {
				this.counter += 1;
				if (this.counter < 3) {
					return Promise.reject(new Error(`no ${this.counter}`));
				}

				return Promise.resolve("yes");
			}

			@retry<TestSubject>({ retries: 3, delay: 10, onRetry: "trackRetry" })
			goo(): Promise<void> {
				if (this.decoratedCounter < 3) {
					return Promise.reject(new Error(`no ${this.decoratedCounter}`));
				}

				return Promise.resolve();
			}

			trackRetry(_error: Error, _count: number): void {
				this.decoratedCounter += 1;
			}
		}

		const subject = new TestSubject();
		await subject.foo();
		await subject.goo();

		expect(errors).toEqual(["no 1", "no 2"]);
		expect(counts).toEqual([1, 2]);
		expect(subject.decoratedCounter).toBe(3);
	});

	test("delay can be a function of the failed attempt", async () => {
		const attempts: number[] = [];

		class TestSubject {
			counter = 0;

			@retry<TestSubject>({
				retries: 2,
				delay: (attempt) => {
					attempts.push(attempt);
					return attempt * 10;
				},
			})
			foo(): Promise<string> {
				this.counter += 1;
				return this.counter < 3 ? Promise.reject(new Error("no")) : Promise.resolve("yes");
			}
		}

		expect(await new TestSubject().foo()).toBe("yes");
		expect(attempts).toEqual([1, 2]);
	});

	test("shouldRetry false rethrows immediately", async () => {
		class TestSubject {
			counter = 0;

			@retry<TestSubject>({
				retries: 3,
				delay: 1,
				shouldRetry: (error) => (error as Error).message !== "fatal",
			})
			foo(): Promise<string> {
				this.counter += 1;
				return Promise.reject(new Error(this.counter === 2 ? "fatal" : "transient"));
			}
		}

		const subject = new TestSubject();
		await expect(subject.foo()).rejects.toThrow("fatal");
		expect(subject.counter).toBe(2);
	});
});
