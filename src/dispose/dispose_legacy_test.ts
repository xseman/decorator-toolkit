import {
	describe,
	expect,
	test,
} from "bun:test";

import { dispose } from "./dispose_legacy.js";

function applyMethod(
	proto: object,
	key: string,
	decorator: (target: object, key: string, desc: PropertyDescriptor) => PropertyDescriptor,
): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("dispose (legacy)", () => {
	test("wires Symbol.dispose to the decorated method", () => {
		class TestSubject {
			disposed = false;

			cleanup(): void {
				this.disposed = true;
			}
		}

		applyMethod(TestSubject.prototype, "cleanup", dispose);

		const subject = new TestSubject();
		expect(typeof (subject as any)[Symbol.dispose]).toBe("function");

		(subject as any)[Symbol.dispose]();
		expect(subject.disposed).toBe(true);
	});

	test("wires Symbol.asyncDispose when async: true", async () => {
		class TestSubject {
			disposed = false;

			async cleanup(): Promise<void> {
				this.disposed = true;
			}
		}

		applyMethod(TestSubject.prototype, "cleanup", dispose({ async: true }) as any);

		const subject = new TestSubject();
		expect(typeof (subject as any)[Symbol.asyncDispose]).toBe("function");

		await (subject as any)[Symbol.asyncDispose]();
		expect(subject.disposed).toBe(true);
	});

	test("multiple @dispose methods all called (LIFO order)", () => {
		const calls: string[] = [];

		class TestSubject {
			alpha(): void {
				calls.push("alpha");
			}

			beta(): void {
				calls.push("beta");
			}

			gamma(): void {
				calls.push("gamma");
			}
		}

		applyMethod(TestSubject.prototype, "alpha", dispose);
		applyMethod(TestSubject.prototype, "beta", dispose);
		applyMethod(TestSubject.prototype, "gamma", dispose);

		const subject = new TestSubject();
		(subject as any)[Symbol.dispose]();

		expect(calls).toEqual(["alpha", "beta", "gamma"]);
	});

	test("supports factory form dispose()", () => {
		let disposed = false;

		class TestSubject {
			cleanup(): void {
				disposed = true;
			}
		}

		applyMethod(TestSubject.prototype, "cleanup", dispose() as any);

		const subject = new TestSubject();
		(subject as any)[Symbol.dispose]();
		expect(disposed).toBe(true);
	});

	test("throws when applied to a non-method descriptor", () => {
		class TestSubject {
			get prop(): number {
				return 1;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(TestSubject.prototype, "prop")!;
		expect(() => dispose(TestSubject.prototype, "prop", desc)).toThrow("@dispose is applicable only on methods.");
	});

	test("dispose method still callable directly", () => {
		let callCount = 0;

		class TestSubject {
			cleanup(): void {
				callCount++;
			}
		}

		applyMethod(TestSubject.prototype, "cleanup", dispose);

		const subject = new TestSubject();
		subject.cleanup();
		(subject as any)[Symbol.dispose]();
		expect(callCount).toBe(2);
	});
});
