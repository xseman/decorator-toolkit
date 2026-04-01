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

	test("uses a provided store", async () => {
		const store = new Map<string, number>();

		class TestSubject {
			@cache<TestSubject, number>({ store, ttlMs: 30 })
			foo(): number {
				return this.goo();
			}

			goo(): number {
				return 1;
			}
		}

		const spy = spyOn(TestSubject.prototype, "goo");
		const subject = new TestSubject();
		subject.foo();
		await sleep(10);
		subject.foo();
		expect(spy.mock.calls).toHaveLength(1);

		store.delete("[]");
		subject.foo();
		expect(spy.mock.calls).toHaveLength(2);
	});

	test("supports key resolvers as functions and method names", () => {
		const mapperCalls: string[] = [];

		class TestSubject {
			mapper(x: string, y: string): string {
				mapperCalls.push(`${x}_${y}`);
				return `${x}_${y}`;
			}

			@cache<TestSubject, string, [string, string]>({
				keyResolver: (x, y) => {
					mapperCalls.push(`fn:${x}_${y}`);
					return `${x}_${y}`;
				},
			})
			fooWithMapper(x: string, y: string): string {
				return this.goo(x, y);
			}

			@cache<TestSubject, string, [string, string]>({ keyResolver: "mapper" })
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

	test("does not clean the default store without ttl", async () => {
		const store = new Map<string, number>();

		class TestSubject {
			@cache<TestSubject, number>({ store })
			foo(): number {
				return 1;
			}
		}

		const subject = new TestSubject();
		subject.foo();
		expect(store.size).toBe(1);
		await sleep(50);
		expect(store.size).toBe(1);
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
});
