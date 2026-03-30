import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	type AsyncCache,
	memoizeAsync,
} from "./memoize-async.js";

describe("memoizeAsync", () => {
	test("caches async method results and expires entries", async () => {
		class TestSubject {
			value = 3;

			@memoizeAsync(10)
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

			@memoizeAsync<TestSubject, string, [string, string]>({
				keyResolver: (x, y) => {
					mapperCalls.push(`fn:${x}_${y}`);
					return `${x}_${y}`;
				},
			})
			fooWithMapper(x: string, y: string): Promise<string> {
				return this.goo(x, y);
			}

			@memoizeAsync<TestSubject, string, [string, string]>({ keyResolver: "mapper" })
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
		const invalidMemoizeAsync: any = memoizeAsync(50);

		expect(() => {
			class TestSubject {
				@invalidMemoizeAsync
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@memoizeAsync is applicable only on methods.");
	});

	test("removes rejected promises from the pending cache", async () => {
		class TestSubject {
			@memoizeAsync(20)
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

	test("uses a provided synchronous cache", async () => {
		const cache = new Map<string, number>();

		class TestSubject {
			@memoizeAsync<TestSubject, number>({ expirationTimeMs: 30, cache })
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

		cache.delete("[]");
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(2);
	});

	test("uses an async cache implementation", async () => {
		const map = new Map<string, number>();

		const cache: AsyncCache<number> = {
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
			@memoizeAsync<TestSubject, number>({ expirationTimeMs: 30, cache })
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

		await cache.delete("[]");
		await subject.foo();
		expect(spy.mock.calls).toHaveLength(2);
	});

	test("propagates async cache errors", async () => {
		const failingHasCache: AsyncCache<number> = {
			delete: async () => undefined,
			get: async () => undefined,
			has: async () => {
				throw new Error("error");
			},
			set: async () => undefined,
		};

		const failingGetCache: AsyncCache<number> = {
			delete: async () => undefined,
			get: async () => {
				throw new Error("error");
			},
			has: async () => true,
			set: async () => undefined,
		};

		class HasTestSubject {
			@memoizeAsync<HasTestSubject, number>({ cache: failingHasCache })
			foo(): Promise<number> {
				return Promise.resolve(1);
			}
		}

		class GetTestSubject {
			@memoizeAsync<GetTestSubject, number>({ cache: failingGetCache })
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

	test("keeps default caches isolated per instance", async () => {
		class TestSubject {
			calls = 0;

			@memoizeAsync()
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
