import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { rateLimit } from "./rate-limit.js";

describe("rateLimit", () => {
	test("throws when used on a field", () => {
		const invalidRateLimit: any = rateLimit({ allowedCalls: 1, timeSpanMs: 1000 });

		expect(() => {
			class InvalidSubject {
				@invalidRateLimit
				boo = "nope";
			}

			return InvalidSubject;
		}).toThrow("@rateLimit is applicable only on methods.");
	});

	test("allows `allowedCalls` per sliding window and throws above it", async () => {
		class TestSubject {
			counter = 0;

			@rateLimit({ allowedCalls: 2, timeSpanMs: 100 })
			foo(): number {
				this.counter += 1;
				return this.counter;
			}
		}

		const subject = new TestSubject();
		expect(subject.foo()).toBe(1);
		expect(subject.foo()).toBe(2);
		expect(() => subject.foo()).toThrow("Rate limit exceeded: 2 calls per 100 ms");
		expect(subject.counter).toBe(2);

		await sleep(120);
		expect(subject.foo()).toBe(3);
	});

	test("keeps windows isolated per instance", () => {
		class TestSubject {
			@rateLimit({ allowedCalls: 1, timeSpanMs: 1000 })
			foo(): void {
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		first.foo();
		expect(() => first.foo()).toThrow("Rate limit exceeded");
		expect(() => second.foo()).not.toThrow();
	});

	test("supports key resolvers as functions and method names", () => {
		class FunctionKeyResolverSubject {
			@rateLimit<FunctionKeyResolverSubject, [string]>({
				allowedCalls: 1,
				timeSpanMs: 1000,
				keyResolver: (value: string) => value,
			})
			foo(value: string): void {
			}
		}

		class NamedKeyResolverSubject {
			@rateLimit<NamedKeyResolverSubject, [string]>({
				allowedCalls: 1,
				timeSpanMs: 1000,
				keyResolver: "goo",
			})
			foo(value: string): void {
			}

			goo(value: string): string {
				return value;
			}
		}

		for (const subject of [new FunctionKeyResolverSubject(), new NamedKeyResolverSubject()]) {
			subject.foo("a");
			subject.foo("b");
			expect(() => subject.foo("a")).toThrow("Rate limit exceeded");
		}
	});

	test("rejects instead of throwing once the method is known to be async", async () => {
		class TestSubject {
			@rateLimit({ allowedCalls: 1, timeSpanMs: 1000 })
			async foo(): Promise<string> {
				return "ok";
			}
		}

		const subject = new TestSubject();
		expect(await subject.foo()).toBe("ok");
		await expect(subject.foo()).rejects.toThrow("Rate limit exceeded");
	});
});
