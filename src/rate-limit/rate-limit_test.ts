import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	rateLimit,
	type RateLimitAsyncCounter,
	SimpleRateLimitCounter,
} from "./rate-limit.js";

class AsyncSimpleRateLimitCounter implements RateLimitAsyncCounter {
	readonly counterMap = new Map<string, number>();

	async getCount(key: string): Promise<number> {
		await sleep(10);
		return this.counterMap.get(key) ?? 0;
	}

	async inc(key: string): Promise<void> {
		await sleep(10);
		if (!this.counterMap.has(key)) {
			await sleep(10);
			this.counterMap.set(key, 0);
		}

		await sleep(10);
		this.counterMap.set(key, (this.counterMap.get(key) ?? 0) + 1);
	}

	async dec(key: string): Promise<void> {
		await sleep(10);
		const currentCount = this.counterMap.get(key) ?? 0;
		await sleep(10);

		if (currentCount <= 1) {
			this.counterMap.delete(key);
			return;
		}

		this.counterMap.set(key, currentCount - 1);
	}
}

describe("rateLimit", () => {
	class TestSubject {
		counter = 0;

		@rateLimit({ allowedCalls: 2, timeSpanMs: 200 })
		foo(): number {
			this.counter += 1;
			return this.counter;
		}
	}

	test("throws when used on a field", () => {
		const invalidRateLimit: any = rateLimit({
			allowedCalls: 1,
			timeSpanMs: 1000,
		});

		expect(() => {
			class InvalidSubject {
				@invalidRateLimit
				boo = "nope";
			}

			return InvalidSubject;
		}).toThrow("@rateLimit is applicable only on a method.");
	});

	test("throws when both async and sync counters are configured", () => {
		expect(() => {
			rateLimit({
				allowedCalls: 1,
				timeSpanMs: 1000,
				rateLimitAsyncCounter: {} as RateLimitAsyncCounter,
				rateLimitCounter: {} as SimpleRateLimitCounter,
			});
		}).toThrow("You cant provide both rateLimitAsyncCounter and rateLimitCounter.");
	});

	test("enforces the synchronous limit with the default counter", async () => {
		const subject = new TestSubject();
		subject.foo();
		await sleep(50);
		expect(subject.counter).toBe(1);
		subject.foo();
		await sleep(50);
		expect(subject.counter).toBe(2);

		await sleep(50);
		try {
			subject.foo();
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("You have acceded the amount of allowed calls");
		}

		await sleep(80);
		expect(subject.foo()).toBe(3);
		expect(subject.counter).toBe(3);
	});

	test("uses a provided synchronous counter", async () => {
		const countMap = new Map<string, number>();

		class CustomCounterSubject {
			counter = 0;

			@rateLimit({
				allowedCalls: 2,
				timeSpanMs: 200,
				rateLimitCounter: new SimpleRateLimitCounter(countMap),
			})
			foo(): void {
				this.counter += 1;
			}
		}

		const subject = new CustomCounterSubject();
		subject.foo();
		expect(countMap.size).toBe(1);
		await sleep(50);
		expect(subject.counter).toBe(1);
		subject.foo();
		expect(countMap.get("__rateLimit__")).toBe(2);
		await sleep(50);
		expect(subject.counter).toBe(2);

		await sleep(50);
		try {
			subject.foo();
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("You have acceded the amount of allowed calls");
		}

		await sleep(80);
		expect(countMap.get("__rateLimit__")).toBe(1);
		subject.foo();
		expect(countMap.get("__rateLimit__")).toBe(2);
		expect(subject.counter).toBe(3);

		await sleep(220);
		expect(countMap.size).toBe(0);
	});

	test("uses a provided async counter", async () => {
		const counter = new AsyncSimpleRateLimitCounter();

		class AsyncCounterSubject {
			counter = 0;

			@rateLimit({
				allowedCalls: 2,
				timeSpanMs: 200,
				rateLimitAsyncCounter: counter,
			})
			async foo(): Promise<number> {
				this.counter += 1;
				return this.counter;
			}
		}

		const first = new AsyncCounterSubject();
		const second = new AsyncCounterSubject();
		await first.foo();
		await sleep(50);
		expect(first.counter).toBe(1);
		await second.foo();
		await sleep(50);
		expect(first.counter).toBe(1);
		expect(second.counter).toBe(1);

		await sleep(50);
		try {
			await first.foo();
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("You have acceded the amount of allowed calls");
		}

		await sleep(80);
		expect(await first.foo()).toBe(2);
		expect(await second.foo()).toBe(2);
		expect(counter.counterMap.has("__rateLimit__")).toBe(true);
	});

	test("supports key resolvers as functions and method names", async () => {
		class FunctionKeyResolverSubject {
			@rateLimit<FunctionKeyResolverSubject, [string]>({
				allowedCalls: 1,
				timeSpanMs: 200,
				keyResolver: (value: string) => value,
			})
			foo(value: string): void {
			}
		}

		class NamedKeyResolverSubject {
			@rateLimit<NamedKeyResolverSubject, [string]>({
				allowedCalls: 1,
				timeSpanMs: 200,
				keyResolver: "goo",
			})
			foo(value: string): void {
			}

			goo(value: string): string {
				return value;
			}
		}

		const functionKey = new FunctionKeyResolverSubject();
		functionKey.foo("a");
		await sleep(50);
		functionKey.foo("b");
		await sleep(50);
		try {
			functionKey.foo("a");
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("You have acceded the amount of allowed calls");
		}
		await sleep(120);
		functionKey.foo("a");

		const namedKey = new NamedKeyResolverSubject();
		namedKey.foo("a");
		await sleep(50);
		namedKey.foo("b");
		await sleep(50);
		try {
			namedKey.foo("a");
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("You have acceded the amount of allowed calls");
		}
		await sleep(120);
		namedKey.foo("a");
	});

	test("invokes a custom exceed handler", async () => {
		class CustomHandlerSubject {
			@rateLimit({
				allowedCalls: 1,
				timeSpanMs: 50,
				exceedHandler: () => {
					throw new Error("blarg");
				},
			})
			foo(): void {
			}
		}

		const subject = new CustomHandlerSubject();
		subject.foo();
		await sleep(20);
		try {
			subject.foo();
			throw new Error("should not reach this line");
		} catch (error) {
			expect((error as Error).message).toBe("blarg");
		}
	});
});
