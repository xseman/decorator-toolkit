import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { runOnce } from "./run-once.js";

describe("runOnce", () => {
	test("first call executes; second call returns same value without re-executing", () => {
		let callCount = 0;

		class TestSubject {
			@runOnce
			compute(): number {
				callCount += 1;
				return 42;
			}
		}

		const subject = new TestSubject();
		expect(subject.compute()).toBe(42);
		expect(subject.compute()).toBe(42);
		expect(subject.compute()).toBe(42);
		expect(callCount).toBe(1);
	});

	test("different arguments on second call are ignored", () => {
		let lastArg: string | undefined;

		class TestSubject {
			@runOnce
			greet(name: string): string {
				lastArg = name;
				return `hello ${name}`;
			}
		}

		const subject = new TestSubject();
		expect(subject.greet("alice")).toBe("hello alice");
		expect(subject.greet("bob")).toBe("hello alice");
		expect(lastArg).toBe("alice");
	});

	test("per-instance isolation", () => {
		let callCount = 0;

		class TestSubject {
			@runOnce
			init(): number {
				callCount += 1;
				return callCount;
			}
		}

		const a = new TestSubject();
		const b = new TestSubject();

		expect(a.init()).toBe(1);
		expect(a.init()).toBe(1);
		expect(b.init()).toBe(2);
		expect(b.init()).toBe(2);
		expect(callCount).toBe(2);
	});

	test("concurrent first calls (async) share one Promise", async () => {
		let callCount = 0;

		class TestSubject {
			@runOnce
			async fetch(): Promise<string> {
				callCount += 1;
				await sleep(20);
				return "data";
			}
		}

		const subject = new TestSubject();
		const [a, b, c] = await Promise.all([subject.fetch(), subject.fetch(), subject.fetch()]);
		expect(a).toBe("data");
		expect(b).toBe("data");
		expect(c).toBe("data");
		expect(callCount).toBe(1);
	});

	test("a rejection resets it so the next call retries", async () => {
		let callCount = 0;

		class TestSubject {
			@runOnce
			async fetch(): Promise<string> {
				callCount += 1;
				if (callCount === 1) throw new Error("first failure");
				return "ok";
			}
		}

		const subject = new TestSubject();
		await expect(subject.fetch()).rejects.toThrow("first failure");
		expect(await subject.fetch()).toBe("ok");
		expect(callCount).toBe(2);
	});

	test("a sync throw resets it so the next call retries", () => {
		let callCount = 0;

		class TestSubject {
			@runOnce
			compute(): number {
				callCount += 1;
				if (callCount === 1) throw new Error("sync fail");
				return 99;
			}
		}

		const subject = new TestSubject();
		expect(() => subject.compute()).toThrow("sync fail");
		expect(subject.compute()).toBe(99);
		expect(callCount).toBe(2);
	});

	test("factory form works: @runOnce() without config", () => {
		let callCount = 0;

		class TestSubject {
			@runOnce()
			compute(): number {
				callCount += 1;
				return 7;
			}
		}

		const subject = new TestSubject();
		expect(subject.compute()).toBe(7);
		expect(subject.compute()).toBe(7);
		expect(callCount).toBe(1);
	});
});
