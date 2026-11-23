import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	cache,
	clearCache,
} from "./cache.js";

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

	test("keeps undefined, null, NaN and bigint arguments apart", () => {
		let calls = 0;

		class TestSubject {
			@cache
			id(value: unknown): unknown {
				calls += 1;
				return value;
			}
		}

		const subject = new TestSubject();
		const results = [undefined, null, Number.NaN, 1n, 1, "1", undefined, Number.NaN, 1n].map((value) => subject.id(value));

		expect(results).toEqual([undefined, null, Number.NaN, 1n, 1, "1", undefined, Number.NaN, 1n]);
		expect(calls).toBe(6);
	});

	test("shares an in-flight promise even when ttl is shorter than the call", async () => {
		let calls = 0;

		class TestSubject {
			@cache(5)
			async load(id: number): Promise<number> {
				calls += 1;
				await sleep(30);
				return id;
			}
		}

		const subject = new TestSubject();
		const first = subject.load(1);
		await sleep(15);
		const second = subject.load(1);
		await first;
		await sleep(15);
		await subject.load(1);

		expect(second).toBe(first);
		expect(calls).toBe(2);
	});

	test("max evicts the least recently used key", () => {
		const calls: number[] = [];

		class TestSubject {
			@cache({ max: 1 })
			last(id: number): number {
				calls.push(id);
				return id;
			}

			@cache({ max: 2 })
			recent(id: number): number {
				calls.push(id * 10);
				return id;
			}
		}

		const subject = new TestSubject();
		[1, 1, 2, 1].forEach((id) => subject.last(id));
		[1, 2, 1, 3, 1, 2].forEach((id) => subject.recent(id));

		expect(calls).toEqual([1, 2, 1, 10, 20, 30, 20]);
		expect(() => cache({ max: 0 })).not.toThrow();
		expect(() => {
			class Invalid {
				@cache({ max: 0 })
				foo(): void {}
			}

			return Invalid;
		}).toThrow("@cache: max must be a positive integer.");
	});

	test("clearCache drops one method or all of them, on that instance only", async () => {
		let calls = 0;

		class TestSubject {
			@cache
			one(): number {
				return calls += 1;
			}

			@cache
			async two(): Promise<number> {
				await sleep(5);
				return calls += 1;
			}

			@cache
			static shared(): number {
				return calls += 1;
			}
		}

		const subject = new TestSubject();
		const other = new TestSubject();
		const before = [subject.one(), await subject.two(), other.one(), TestSubject.shared()];

		clearCache(subject, "one");
		const afterOne = [subject.one(), await subject.two(), other.one()];
		clearCache(subject);
		clearCache(TestSubject);
		const afterAll = [subject.one(), await subject.two(), other.one(), TestSubject.shared()];

		expect(before).toEqual([1, 2, 3, 4]);
		expect(afterOne).toEqual([5, 2, 3]);
		expect(afterAll).toEqual([6, 7, 3, 8]);
	});

	test("a call in flight during clearCache is not stored again", async () => {
		let calls = 0;

		class TestSubject {
			@cache
			async load(): Promise<number> {
				calls += 1;
				await sleep(10);
				return calls;
			}
		}

		const subject = new TestSubject();
		const stale = subject.load();
		clearCache(subject);
		const fresh = subject.load();

		expect(await Promise.all([stale, fresh, subject.load()])).toEqual([2, 2, 2]);
		expect(fresh).not.toBe(stale);
	});
});
