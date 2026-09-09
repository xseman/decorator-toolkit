import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { cache } from "./cache.js";

describe("cache", () => {
	test("caches method results and expires entries", async () => {
		class TestSubject {
			value = 3;

			@cache(10)
			foo(x: number, y: number): number {
				return this.goo(x, y);
			}

			goo(x: number, y: number): number {
				expect(this.value).toBe(3);
				return x + y;
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const spy = spyOn(TestSubject.prototype, "goo");

		const first = subject.foo(1, 2);
		const second = subject.foo(1, 2);
		const different = subject.foo(1, 3);

		expect(spy.mock.calls).toHaveLength(2);
		expect(first).toBe(3);
		expect(second).toBe(3);
		expect(different).toBe(4);

		await sleep(20);
		const third = subject.foo(1, 2);
		expect(spy.mock.calls).toHaveLength(3);
		expect(third).toBe(3);
	});

	test("throws when used on a field", () => {
		const invalidCache: any = cache;

		expect(() => {
			class TestSubject {
				@invalidCache
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@cache is applicable only on methods.");
	});

	test("supports key resolvers as functions and method names", () => {
		const mapperCalls: string[] = [];

		class TestSubject {
			mapper(x: string, y: string): string {
				mapperCalls.push(`${x}_${y}`);
				return `${x}_${y}`;
			}

			@cache<TestSubject, [string, string]>({
				keyResolver: (x, y) => {
					mapperCalls.push(`fn:${x}_${y}`);
					return `${x}_${y}`;
				},
			})
			fooWithMapper(x: string, y: string): string {
				return this.goo(x, y);
			}

			@cache<TestSubject, [string, string]>({ keyResolver: "mapper" })
			fooWithNamedMapper(x: string, y: string): string {
				return this.goo(x, y);
			}

			goo(x: string, y: string): string {
				return x + y;
			}
		}

		const subject = new TestSubject();
		const spy = spyOn(TestSubject.prototype, "goo");

		subject.fooWithMapper("x", "y");
		subject.fooWithMapper("x", "y");
		subject.fooWithNamedMapper("x", "y");
		subject.fooWithNamedMapper("x", "y");

		expect(spy.mock.calls).toHaveLength(2);
		expect(mapperCalls).toEqual(["fn:x_y", "fn:x_y", "x_y", "x_y"]);
	});

	test("keeps default stores isolated per instance", () => {
		class TestSubject {
			calls = 0;

			@cache
			foo(x: number): number {
				this.calls += 1;
				return x + this.calls;
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		expect(first.foo(1)).toBe(2);
		expect(first.foo(1)).toBe(2);
		expect(second.foo(1)).toBe(2);
		expect(second.foo(1)).toBe(2);
		expect(first.calls).toBe(1);
		expect(second.calls).toBe(1);
	});

	test("does not expire without ttl", async () => {
		class TestSubject {
			calls = 0;

			@cache()
			foo(): number {
				this.calls += 1;
				return this.calls;
			}
		}

		const subject = new TestSubject();
		expect(subject.foo()).toBe(1);
		await sleep(30);
		expect(subject.foo()).toBe(1);
	});

	test("shares an in-flight promise and evicts it when it rejects", async () => {
		class TestSubject {
			calls = 0;

			@cache
			async foo(): Promise<number> {
				this.calls += 1;
				if (this.calls === 1) {
					throw new Error("boom");
				}

				return this.calls;
			}
		}

		const subject = new TestSubject();
		const first = subject.foo();
		expect(subject.foo()).toBe(first);
		await expect(first).rejects.toThrow("boom");
		expect(await subject.foo()).toBe(2);
		expect(await subject.foo()).toBe(2);
		expect(subject.calls).toBe(2);
	});

	test("unbound calls share a single fallback store", () => {
		class TestSubject {
			@cache
			foo(x: number): number {
				calls += 1;
				return x + calls;
			}
		}

		let calls = 0;
		const detached = TestSubject.prototype.foo;
		expect(detached.call(undefined, 1)).toBe(2);
		expect(detached.call(undefined, 1)).toBe(2);
		expect(calls).toBe(1);
	});
});
