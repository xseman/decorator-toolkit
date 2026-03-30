import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { delegate } from "./delegate.js";

describe("delegate", () => {
	test("throws when used on a field", () => {
		const invalidDelegate: any = delegate();

		expect(() => {
			class TestSubject {
				@invalidDelegate
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@delegate is applicable only on methods.");
	});

	test("delegates concurrent invocations with the same key", async () => {
		let counter = 0;

		class TestSubject {
			@delegate()
			async foo(): Promise<number> {
				counter += 1;
				await sleep(20);
				return 1;
			}
		}

		const subject = new TestSubject();
		subject.foo();
		subject.foo();

		const result = await Promise.all([subject.foo(), subject.foo()]);
		expect(result).toEqual([1, 1]);
		expect(counter).toBe(1);
	});

	test("delegates only until the shared promise settles", async () => {
		const timestampBefore = Date.now();
		let counter = 0;

		class TestSubject {
			@delegate()
			async foo(): Promise<number> {
				counter += 1;
				await sleep(20);
				return Date.now();
			}
		}

		const subject = new TestSubject();
		subject.foo();
		subject.foo();

		const first = await Promise.all([subject.foo(), subject.foo()]);
		expect(first[0]).toBe(first[1]);
		expect(first[0]).toBeGreaterThan(timestampBefore);
		expect(counter).toBe(1);

		subject.foo();
		subject.foo();
		const second = await Promise.all([subject.foo(), subject.foo()]);
		expect(second[0]).toBe(second[1]);
		expect(second[0]).toBeGreaterThan(first[0]);
		expect(counter).toBe(2);
	});

	test("uses default JSON serialization for keys", async () => {
		let counter = 0;

		class TestSubject {
			@delegate()
			async foo(x: string): Promise<string> {
				counter += 1;
				await sleep(20);
				return x;
			}
		}

		const result = await Promise.all([
			new TestSubject().foo("a"),
			new TestSubject().foo("a"),
			new TestSubject().foo("b"),
		]);
		expect(result).toEqual(["a", "a", "b"]);
		expect(counter).toBe(3);
	});

	test("supports many arguments and custom serialization", async () => {
		let counter = 0;

		class ManyArgs {
			@delegate()
			async foo(...args: number[]): Promise<number> {
				counter += 1;
				await sleep(20);
				return args.reduce((left, right) => left + right, 0);
			}
		}

		const manyArgs = new ManyArgs();
		const manyArgsResult = await Promise.all([
			manyArgs.foo(1, 1, 1, 1),
			manyArgs.foo(1, 1, 1, 2),
			manyArgs.foo(1, 1, 1, 1),
		]);
		expect(manyArgsResult).toEqual([4, 5, 4]);
		expect(counter).toBe(2);

		class CustomKey {
			@delegate((a: number, b: number) => `${a}_${b}`)
			async foo(a: number, b: number): Promise<number> {
				counter += 1;
				await sleep(20);
				return a + b;
			}
		}

		const customKey = new CustomKey();
		const customResult = await Promise.all([
			customKey.foo(1, 1),
			customKey.foo(2, 1),
			customKey.foo(1, 1),
		]);
		expect(customResult).toEqual([2, 3, 2]);
		expect(counter).toBe(4);
	});

	test("preserves static method context", async () => {
		class Example {
			static ex2(): Promise<number> {
				return Promise.resolve(2);
			}

			@delegate()
			static async ex1(): Promise<number> {
				return Example.ex2();
			}
		}

		expect(await Example.ex1()).toBe(2);
	});
});
