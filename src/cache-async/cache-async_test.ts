import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	type AsyncCacheStore,
	cacheAsync,
} from "./cache-async.js";

describe("cacheAsync", () => {
	test("caches async method results and expires entries", async () => {
		class TestSubject {
			value = 3;

			@cacheAsync(10)
			foo(x: number, y: number): Promise<number> {
				return this.goo(x, y);
			}

			goo(x: number, y: number): Promise<number> {
				expect(this.value).toBe(3);
				return Promise.resolve(x + y);
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const spy = spyOn(TestSubject.prototype, "goo");

		const first = subject.foo(1, 2);
		const second = subject.foo(1, 2);
		const different = subject.foo(1, 3);

		expect(await first).toBe(3);
		expect(await second).toBe(3);
		expect(await different).toBe(4);
		expect(spy.mock.calls).toHaveLength(2);

		await sleep(20);
		const third = subject.foo(1, 2);
		expect(await third).toBe(3);
		expect(spy.mock.calls).toHaveLength(3);
	});

	test("supports key resolvers as functions and method names", async () => {
		const mapperCalls: string[] = [];

		class TestSubject {
			mapper(x: string, y: string): string {
				mapperCalls.push(`${x}_${y}`);
				return `${x}_${y}`;
			}

			@cacheAsync<TestSubject, string, [string, string]>({
				keyResolver: (x, y) => {
					mapperCalls.push(`fn:${x}_${y}`);
					return `${x}_${y}`;
				},
			})
			fooWithMapper(x: string, y: string): Promise<string> {
				return this.goo(x, y);
			}

			@cacheAsync<TestSubject, string, [string, string]>({ keyResolver: "mapper" })
			fooWithNamedMapper(x: string, y: string): Promise<string> {
				return this.goo(x, y);
			}

			goo(x: string, y: string): Promise<string> {
				return Promise.resolve(x + y);
			}
		}

		const subject = new TestSubject();
		const spy = spyOn(TestSubject.prototype, "goo");

		await subject.fooWithMapper("x", "y");
		await subject.fooWithMapper("x", "y");
		await subject.fooWithNamedMapper("x", "y");
		await subject.fooWithNamedMapper("x", "y");

		expect(spy.mock.calls).toHaveLength(2);
		expect(mapperCalls).toEqual(["fn:x_y", "fn:x_y", "x_y", "x_y"]);
	});

	test("throws when used on a field", () => {
		const invalidCacheAsync: any = cacheAsync;

		expect(() => {
			class TestSubject {
				@invalidCacheAsync
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@cacheAsync is applicable only on methods.");
	});

	test("removes rejected promises from the pending store", async () => {
		class TestSubject {
			@cacheAsync(20)
			foo(): Promise<string> {
				return this.goo();
			}

			goo(): Promise<string> {
				return Promise.reject(new Error("rejected"));
			}
		}

		const subject = new TestSubject();
		const spy = spyOn(TestSubject.prototype, "goo");

		await subject.foo().catch((error) => {
			expect((error as Error).message).toBe("rejected");
		});

		await sleep(25);
		await subject.foo().catch((error) => {
			expect((error as Error).message).toBe("rejected");
		});

		expect(spy.mock.calls).toHaveLength(2);
	});

	test("uses a provided synchronous store", async () => {
		const store = new Map<string, number>();

		class TestSubject {
			@cacheAsync<TestSubject, number>({ store, ttlMs: 30 })
			foo(): Promise<number> {
				return this.goo();
			}

			goo(): Promise<number> {
				return Promise.resolve(1);
			}
		}

		const spy = spyOn(TestSubject.prototype, "goo");
		const subject = new TestSubject();
		await subject.foo();
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(1);

		store.delete("[]");
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(2);
	});

	test("uses an async store implementation", async () => {
		const map = new Map<string, number>();

		const store: AsyncCacheStore<number> = {
			delete: async (key: string) => {
				map.delete(key);
			},
			get: async (key: string) => map.get(key),
			has: async (key: string) => map.has(key),
			set: async (key: string, value: number) => {
				map.set(key, value);
			},
		};

		class TestSubject {
			@cacheAsync<TestSubject, number>({ store, ttlMs: 30 })
			foo(): Promise<number> {
				return this.goo();
			}

			goo(): Promise<number> {
				return Promise.resolve(1);
			}
		}

		const subject = new TestSubject();
		const spy = spyOn(TestSubject.prototype, "goo");
		await subject.foo();
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(1);

		await store.delete("[]");
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(2);
	});

	test("propagates async store errors", async () => {
		const failingHasStore: AsyncCacheStore<number> = {
			delete: async () => undefined,
			get: async () => undefined,
			has: async () => {
				throw new Error("error");
			},
			set: async () => undefined,
		};

		const failingGetStore: AsyncCacheStore<number> = {
			delete: async () => undefined,
			get: async () => {
				throw new Error("error");
			},
			has: async () => true,
			set: async () => undefined,
		};

		class HasTestSubject {
			@cacheAsync<HasTestSubject, number>({ store: failingHasStore })
			foo(): Promise<number> {
				return Promise.resolve(1);
			}
		}

		class GetTestSubject {
			@cacheAsync<GetTestSubject, number>({ store: failingGetStore })
			foo(): Promise<number> {
				return Promise.resolve(1);
			}
		}

		try {
			await new HasTestSubject().foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect((error as Error).message).toBe("error");
		}

		try {
			await new GetTestSubject().foo();
			throw new Error("should not reach here");
		} catch (error) {
			expect((error as Error).message).toBe("error");
		}
	});

	test("keeps default stores isolated per instance", async () => {
		class TestSubject {
			calls = 0;

			@cacheAsync
			async foo(x: number): Promise<number> {
				this.calls += 1;
				return x + this.calls;
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		expect(await first.foo(1)).toBe(2);
		expect(await first.foo(1)).toBe(2);
		expect(await second.foo(1)).toBe(2);
		expect(await second.foo(1)).toBe(2);
		expect(first.calls).toBe(1);
		expect(second.calls).toBe(1);
	});
});
