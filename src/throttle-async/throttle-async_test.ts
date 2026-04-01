import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { throttleAsync } from "./throttle-async.js";

describe("throttleAsync", () => {
	test("throws when used on a field", () => {
		const invalidThrottleAsync: any = throttleAsync;

		expect(() => {
			class TestSubject {
				@invalidThrottleAsync
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@throttleAsync is applicable only on methods.");
	});

	test("serializes async invocations when parallelCalls is 1", async () => {
		class TestSubject {
			value = 0;

			@throttleAsync
			async foo(x: string): Promise<string> {
				this.value += 1;
				await sleep(30);
				return x;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBe(0);

		const first = subject.foo("a");
		expect(subject.value).toBe(1);

		const second = subject.foo("b");
		expect(subject.value).toBe(1);

		expect(await first).toBe("a");
		expect(await second).toBe("b");
		expect(subject.value).toBe(2);
	});

	test("allows configured parallelism", async () => {
		class TestSubject {
			value = 0;

			@throttleAsync(2)
			async foo(): Promise<number> {
				this.value += 1;
				await sleep(20);
				return this.value;
			}
		}

		const subject = new TestSubject();
		const [first, second] = await Promise.all([subject.foo(), subject.foo()]);
		expect(first).toBe(2);
		expect(second).toBe(2);
		expect(subject.value).toBe(2);
	});

	test("continues processing after exceptions", async () => {
		class TestSubject {
			value = 0;

			@throttleAsync()
			async foo(x: string): Promise<string> {
				this.value += 1;
				await sleep(30);

				if (this.value === 1) {
					throw new Error("blarg");
				}

				return x;
			}
		}

		const subject = new TestSubject();
		await subject.foo("a").catch((error) => {
			expect((error as Error).message).toBe("blarg");
		});
		expect(await subject.foo("b")).toBe("b");
	});

	test("starts queued calls as capacity frees up", async () => {
		class TestSubject {
			value = 0;

			@throttleAsync(2)
			async foo(x: string): Promise<string> {
				this.value += 1;
				await sleep(20);
				return x;
			}
		}

		const subject = new TestSubject();
		void subject.foo("a");
		expect(subject.value).toBe(1);
		void subject.foo("b");
		expect(subject.value).toBe(2);

		await sleep(30);
		void subject.foo("c");
		expect(subject.value).toBe(3);

		const value = await subject.foo("d");
		expect(subject.value).toBe(4);
		expect(value).toBe("d");
	});

	test("processes long queues within the expected time window", async () => {
		class TestSubject {
			@throttleAsync(2)
			async foo(x: string): Promise<string> {
				await sleep(100);
				return x;
			}
		}

		const start = Date.now();
		const subject = new TestSubject();
		void subject.foo("a");
		void subject.foo("b");
		void subject.foo("c");
		void subject.foo("d");
		void subject.foo("e");
		void subject.foo("f");
		void subject.foo("g");
		void subject.foo("h");
		void subject.foo("j");
		await subject.foo("k");

		const seconds = (Date.now() - start) / 1000;
		expect(seconds).toBeGreaterThanOrEqual(0.5);
		expect(seconds).toBeLessThan(0.7);
	});
});
