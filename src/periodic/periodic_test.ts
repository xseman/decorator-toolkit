import {
	afterEach,
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { periodic } from "./periodic.js";

describe("periodic", () => {
	test("auto-starts after construction and repeats on interval", async () => {
		let callCount = 0;

		class TestSubject {
			@periodic(20)
			tick(): void {
				callCount += 1;
			}
		}

		const subject = new TestSubject();
		expect(callCount).toBe(0);

		await sleep(55);
		expect(callCount).toBeGreaterThanOrEqual(2);

		(subject as any)[Symbol.dispose]();
	});

	test("immediate: true triggers invocation before first tick", async () => {
		let callCount = 0;

		class TestSubject {
			@periodic({ intervalMs: 50, immediate: true })
			tick(): void {
				callCount += 1;
			}
		}

		const subject = new TestSubject();
		expect(callCount).toBe(1);

		(subject as any)[Symbol.dispose]();
	});

	test("overlap: skip does not pile up slow async invocations", async () => {
		let running = 0;
		let maxRunning = 0;

		class TestSubject {
			@periodic({ intervalMs: 10, overlap: "skip" })
			async tick(): Promise<void> {
				running += 1;
				maxRunning = Math.max(maxRunning, running);
				await sleep(40);
				running -= 1;
			}
		}

		const subject = new TestSubject();
		await sleep(60);
		expect(maxRunning).toBe(1);

		(subject as any)[Symbol.dispose]();
	});

	test("overlap: allow runs concurrent invocations", async () => {
		let running = 0;
		let maxRunning = 0;

		class TestSubject {
			@periodic({ intervalMs: 10, overlap: "allow" })
			async tick(): Promise<void> {
				running += 1;
				maxRunning = Math.max(maxRunning, running);
				await sleep(40);
				running -= 1;
			}
		}

		const subject = new TestSubject();
		await sleep(60);
		expect(maxRunning).toBeGreaterThan(1);

		(subject as any)[Symbol.dispose]();
	});

	test("Symbol.dispose stops all future ticks", async () => {
		let callCount = 0;

		class TestSubject {
			@periodic(15)
			tick(): void {
				callCount += 1;
			}
		}

		const subject = new TestSubject();
		await sleep(25);
		const countAtDispose = callCount;
		(subject as any)[Symbol.dispose]();

		await sleep(40);
		expect(callCount).toBe(countAtDispose);
	});

	test("errors route to onError function; interval continues", async () => {
		const errors: unknown[] = [];
		let callCount = 0;

		class TestSubject {
			@periodic({
				intervalMs: 15,
				onError: (e) => {
					errors.push(e);
				},
			})
			tick(): void {
				callCount += 1;
				throw new Error(`tick ${callCount}`);
			}
		}

		const subject = new TestSubject();
		await sleep(50);
		expect(errors.length).toBeGreaterThanOrEqual(2);
		expect((errors[0] as Error).message).toBe("tick 1");

		(subject as any)[Symbol.dispose]();
	});

	test("errors route to onError method name; interval continues", async () => {
		const errors: unknown[] = [];

		class TestSubject {
			handleError(error: unknown): void {
				errors.push(error);
			}

			@periodic({ intervalMs: 15, onError: "handleError" })
			tick(): void {
				throw new Error("method error");
			}
		}

		const subject = new TestSubject();
		await sleep(40);
		expect(errors.length).toBeGreaterThanOrEqual(1);

		(subject as any)[Symbol.dispose]();
	});

	test("static usage throws at decoration time", () => {
		expect(() => {
			class TestSubject {
				@periodic(10)
				static tick(): void {}
			}

			return TestSubject;
		}).toThrow("@periodic does not support static methods.");
	});

	test("multiple @periodic methods on one instance dispose independently", async () => {
		let aCount = 0;
		let bCount = 0;

		class TestSubject {
			@periodic(15)
			tickA(): void {
				aCount += 1;
			}

			@periodic(15)
			tickB(): void {
				bCount += 1;
			}
		}

		const subject = new TestSubject();
		await sleep(25);
		expect(aCount).toBeGreaterThanOrEqual(1);
		expect(bCount).toBeGreaterThanOrEqual(1);

		(subject as any)[Symbol.dispose]();
		const aAtDispose = aCount;
		const bAtDispose = bCount;

		await sleep(40);
		expect(aCount).toBe(aAtDispose);
		expect(bCount).toBe(bAtDispose);
	});

	test("zero intervalMs throws at decoration time", () => {
		expect(() => {
			class TestSubject {
				@periodic(0)
				tick(): void {}
			}

			return TestSubject;
		}).toThrow("@periodic: intervalMs must be a positive number.");
	});

	test("keeps ticking when onError itself throws", async () => {
		let callCount = 0;

		class TestSubject {
			@periodic<TestSubject>({
				intervalMs: 15,
				onError: () => {
					throw new Error("reporter is down");
				},
			})
			tick(): void {
				callCount += 1;
				throw new Error("tick failed");
			}
		}

		using _subject = new TestSubject() as TestSubject & Disposable;
		await sleep(50);
		expect(callCount).toBeGreaterThanOrEqual(2);
	});
});
