import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	circuitBreaker,
	CircuitOpenError,
} from "./circuit-breaker.js";

describe("circuitBreaker", () => {
	test("throws when used on a field", () => {
		const invalid: any = circuitBreaker({ failures: 1, resetMs: 10 });

		expect(() => {
			class TestSubject {
				@invalid
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@circuitBreaker is applicable only on methods.");
	});

	test("opens after N consecutive failures and fails fast without calling the method", async () => {
		class TestSubject {
			calls = 0;

			@circuitBreaker({ failures: 2, resetMs: 1000 })
			async foo(): Promise<void> {
				this.calls += 1;
				throw new Error("down");
			}
		}

		const subject = new TestSubject();
		await expect(subject.foo()).rejects.toThrow("down");
		await expect(subject.foo()).rejects.toThrow("down");

		const error = await subject.foo().catch((caught) => caught);
		expect(error).toBeInstanceOf(CircuitOpenError);
		expect((error as Error).cause).toBeInstanceOf(Error);
		expect(subject.calls).toBe(2);
	});

	test("half-open admits one probe; other calls fail fast until it settles", async () => {
		let release!: () => void;

		class TestSubject {
			calls = 0;

			@circuitBreaker({ failures: 1, resetMs: 20 })
			async foo(): Promise<string> {
				this.calls += 1;
				if (this.calls === 1) {
					throw new Error("down");
				}
				if (this.calls === 2) {
					await new Promise<void>((resolve) => {
						release = resolve;
					});
				}

				return "up";
			}
		}

		const subject = new TestSubject();
		await expect(subject.foo()).rejects.toThrow("down");
		await expect(subject.foo()).rejects.toBeInstanceOf(CircuitOpenError);

		await sleep(30);
		const probe = subject.foo();
		await expect(subject.foo()).rejects.toBeInstanceOf(CircuitOpenError);

		release();
		expect(await probe).toBe("up");
		expect(await subject.foo()).toBe("up");
		expect(subject.calls).toBe(3);
	});

	test("a failed probe re-opens the circuit", async () => {
		class TestSubject {
			calls = 0;

			@circuitBreaker({ failures: 1, resetMs: 20 })
			async foo(): Promise<void> {
				this.calls += 1;
				throw new Error("down");
			}
		}

		const subject = new TestSubject();
		await expect(subject.foo()).rejects.toThrow("down");
		await sleep(30);
		await expect(subject.foo()).rejects.toThrow("down");
		await expect(subject.foo()).rejects.toBeInstanceOf(CircuitOpenError);
		expect(subject.calls).toBe(2);
	});

	test("a success from a call admitted before opening does not close the circuit", async () => {
		let releaseSlow!: () => void;

		class TestSubject {
			@circuitBreaker({ failures: 1, resetMs: 1000 })
			async foo(slow: boolean): Promise<string> {
				if (slow) {
					await new Promise<void>((resolve) => {
						releaseSlow = resolve;
					});
					return "late";
				}

				throw new Error("down");
			}
		}

		const subject = new TestSubject();
		const slow = subject.foo(true);
		await expect(subject.foo(false)).rejects.toThrow("down");

		releaseSlow();
		expect(await slow).toBe("late");
		await expect(subject.foo(false)).rejects.toBeInstanceOf(CircuitOpenError);
	});

	test("keeps state isolated per instance", async () => {
		class TestSubject {
			@circuitBreaker({ failures: 1, resetMs: 1000 })
			async foo(): Promise<void> {
				throw new Error("down");
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		await expect(first.foo()).rejects.toThrow("down");
		await expect(first.foo()).rejects.toBeInstanceOf(CircuitOpenError);
		await expect(second.foo()).rejects.toThrow("down");
	});

	test("works on sync methods", () => {
		class TestSubject {
			@circuitBreaker({ failures: 1, resetMs: 1000 })
			foo(): number {
				throw new Error("down");
			}
		}

		const subject = new TestSubject();
		expect(() => subject.foo()).toThrow("down");
		expect(() => subject.foo()).toThrow(CircuitOpenError);
	});
});
