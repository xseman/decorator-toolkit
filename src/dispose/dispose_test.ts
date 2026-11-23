import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { periodic } from "../periodic/periodic.js";
import { dispose } from "./dispose.js";

describe("dispose", () => {
	test("wires Symbol.dispose to the decorated method", () => {
		class TestSubject {
			disposed = false;

			@dispose
			cleanup(): void {
				this.disposed = true;
			}
		}

		const subject = new TestSubject();
		expect(typeof (subject as any)[Symbol.dispose]).toBe("function");

		(subject as any)[Symbol.dispose]();
		expect(subject.disposed).toBe(true);
	});

	test("using statement triggers disposal", () => {
		let disposed = false;

		class Resource {
			@dispose
			cleanup(): void {
				disposed = true;
			}
		}

		{
			using _r = new Resource() as unknown as Disposable;
		}

		expect(disposed).toBe(true);
	});

	test("wires Symbol.asyncDispose when async: true", async () => {
		class TestSubject {
			disposed = false;

			@dispose({ async: true })
			async cleanup(): Promise<void> {
				this.disposed = true;
			}
		}

		const subject = new TestSubject();
		expect(typeof (subject as any)[Symbol.asyncDispose]).toBe("function");

		await (subject as any)[Symbol.asyncDispose]();
		expect(subject.disposed).toBe(true);
	});

	test("await using statement triggers async disposal", async () => {
		let disposed = false;

		class Resource {
			@dispose({ async: true })
			async cleanup(): Promise<void> {
				disposed = true;
			}
		}

		{
			await using _r = new Resource() as unknown as AsyncDisposable;
		}

		expect(disposed).toBe(true);
	});

	test("multiple @dispose methods are all called", () => {
		const calls: string[] = [];

		class TestSubject {
			@dispose
			first(): void {
				calls.push("first");
			}

			@dispose
			second(): void {
				calls.push("second");
			}
		}

		const subject = new TestSubject();
		(subject as any)[Symbol.dispose]();

		expect(calls).toContain("first");
		expect(calls).toContain("second");
		expect(calls).toHaveLength(2);
	});

	test("disposal runs in reverse declaration order (LIFO)", () => {
		const calls: string[] = [];

		class TestSubject {
			@dispose
			alpha(): void {
				calls.push("alpha");
			}

			@dispose
			beta(): void {
				calls.push("beta");
			}

			@dispose
			gamma(): void {
				calls.push("gamma");
			}
		}

		const subject = new TestSubject();
		(subject as any)[Symbol.dispose]();

		expect(calls).toEqual(["gamma", "beta", "alpha"]);
	});

	test("supports factory form @dispose()", () => {
		let disposed = false;

		class TestSubject {
			@dispose()
			cleanup(): void {
				disposed = true;
			}
		}

		const subject = new TestSubject();
		(subject as any)[Symbol.dispose]();
		expect(disposed).toBe(true);
	});

	test("throws when applied to a field", () => {
		const invalidDispose: any = dispose;

		expect(() => {
			class TestSubject {
				@invalidDispose
				prop = 1;
			}

			return TestSubject;
		}).toThrow("@dispose is applicable only on methods.");
	});

	test("dispose method still callable directly", () => {
		let callCount = 0;

		class TestSubject {
			@dispose
			cleanup(): void {
				callCount++;
			}
		}

		const subject = new TestSubject();
		subject.cleanup();
		(subject as any)[Symbol.dispose]();
		expect(callCount).toBe(2);
	});

	test("each instance has independent disposal state", () => {
		const log: string[] = [];

		class TestSubject {
			constructor(private label: string) {}

			@dispose
			cleanup(): void {
				log.push(this.label);
			}
		}

		const a = new TestSubject("A");
		const b = new TestSubject("B");

		(a as any)[Symbol.dispose]();
		expect(log).toEqual(["A"]);

		(b as any)[Symbol.dispose]();
		expect(log).toEqual(["A", "B"]);
	});

	test("a throwing disposer does not skip the remaining ones", async () => {
		const calls: string[] = [];

		class TestSubject {
			@dispose
			first(): void {
				calls.push("first");
			}

			@dispose
			second(): void {
				throw new Error("second failed");
			}
		}

		class AsyncSubject {
			@dispose({ async: true })
			async first(): Promise<void> {
				calls.push("async first");
			}

			@dispose({ async: true })
			async second(): Promise<void> {
				throw new Error("async second failed");
			}
		}

		expect(() => (new TestSubject() as any)[Symbol.dispose]()).toThrow("second failed");
		await expect((new AsyncSubject() as any)[Symbol.asyncDispose]()).rejects.toThrow("async second failed");

		expect(calls).toEqual(["first", "async first"]);
	});

	test("await using runs sync and async disposers as one stack, in reverse declaration order", async () => {
		const calls: string[] = [];

		class TestSubject {
			@dispose
			first(): void {
				calls.push("first");
			}

			@dispose({ async: true })
			async second(): Promise<void> {
				calls.push("second");
			}

			@dispose
			third(): void {
				calls.push("third");
			}
		}

		{
			await using _subject = new TestSubject() as unknown as AsyncDisposable;
		}

		{
			using _subject = new TestSubject() as unknown as Disposable;
		}

		expect(calls).toEqual(["third", "second", "first", "third", "first"]);
	});

	test("runs a disposer once when the class's own asyncDispose delegates to dispose", async () => {
		const calls: string[] = [];

		class TestSubject {
			@dispose
			close(): void {
				calls.push("close");
			}

			[Symbol.dispose](): void {
				calls.push("own sync");
			}

			async [Symbol.asyncDispose](): Promise<void> {
				calls.push("own async");
				this[Symbol.dispose]();
			}
		}

		const subject = new TestSubject();
		await subject[Symbol.asyncDispose]();
		subject[Symbol.dispose]();

		expect(calls).toEqual(["close", "own async", "own sync", "own sync"]);
	});

	test("await using also runs sync disposers and stops @periodic", async () => {
		const calls: string[] = [];
		let ticks = 0;

		class TestSubject {
			@dispose({ async: true })
			async closeAsync(): Promise<void> {
				calls.push("async");
			}

			@dispose
			closeSync(): void {
				calls.push("sync");
			}

			@periodic(5)
			tick(): void {
				ticks += 1;
			}
		}

		{
			await using _subject = new TestSubject() as unknown as AsyncDisposable;
			await sleep(20);
		}

		const ticksAtDispose = ticks;
		await sleep(20);

		expect(calls).toEqual(["sync", "async"]);
		expect(ticksAtDispose).toBeGreaterThan(0);
		expect(ticks).toBe(ticksAtDispose);
	});
});
