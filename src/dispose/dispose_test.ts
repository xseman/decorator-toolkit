import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

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

	test("multiple @dispose methods all called in declaration order (FIFO)", () => {
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

	test("disposal order follows declaration order (FIFO)", () => {
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

		expect(calls).toEqual(["alpha", "beta", "gamma"]);
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
});
