import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { batch } from "./batch.js";

describe("batch", () => {
	test("throws when used on a field", () => {
		const invalidBatch: any = batch;

		expect(() => {
			class TestSubject {
				@invalidBatch
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@batch is applicable only on methods.");
	});

	test("rejects a negative window", () => {
		expect(() => batch(-1)).toThrow("@batch: windowMs must be a non-negative number.");
	});

	test("merges calls from one tick and gives each caller its own results", async () => {
		const batches: number[][] = [];

		class TestSubject {
			@batch
			async double(items: number[]): Promise<number[]> {
				batches.push(items);
				return items.map((item) => item * 2);
			}
		}

		const subject = new TestSubject();
		const first = [1];
		const results = await Promise.all([subject.double(first), subject.double([2, 3]), subject.double([])]);

		expect(results).toEqual([[2], [4, 6], []]);
		expect(batches).toEqual([[1, 2, 3]]);
		expect(first).toEqual([1]);
	});

	test("starts a new batch after the window and per instance", async () => {
		const batches: number[][] = [];

		class TestSubject {
			@batch(20)
			async echo(items: number[]): Promise<number[]> {
				batches.push(items);
				return items;
			}
		}

		const subject = new TestSubject();
		const early = subject.echo([1]);
		await sleep(5);
		const sameWindow = subject.echo([2]);
		const otherInstance = new TestSubject().echo([3]);
		await sleep(30);
		const nextWindow = subject.echo([4]);

		expect(await Promise.all([early, sameWindow, otherInstance, nextWindow])).toEqual([[1], [2], [3], [4]]);
		expect(batches).toEqual([[1, 2], [3], [4]]);
	});

	test("rejects every caller when the method fails or returns the wrong number of results", async () => {
		class TestSubject {
			@batch()
			async fail(_items: number[]): Promise<number[]> {
				throw new Error("backend down");
			}

			@batch()
			async short(_items: number[]): Promise<number[]> {
				return [1];
			}
		}

		const subject = new TestSubject();
		const failed = await Promise.allSettled([subject.fail([1]), subject.fail([2])]);
		const short = await Promise.allSettled([subject.short([1]), subject.short([2])]);

		expect(failed.map((result) => (result as PromiseRejectedResult).reason.message)).toEqual(["backend down", "backend down"]);
		expect(short.map((result) => (result as PromiseRejectedResult).reason.message)).toEqual([
			"@batch: expected 2 results, got 1.",
			"@batch: expected 2 results, got 1.",
		]);
	});
});
