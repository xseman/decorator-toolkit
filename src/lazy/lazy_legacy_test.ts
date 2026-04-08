import {
	describe,
	expect,
	test,
} from "bun:test";

import { lazy } from "./lazy_legacy.js";

function applyGetter(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = (decorator as any)(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("lazy (legacy)", () => {
	test("computes value on first access", () => {
		let callCount = 0;

		class TestSubject {
			get value(): number {
				callCount++;
				return 42;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy);

		const subject = new TestSubject();
		expect(subject.value).toBe(42);
		expect(callCount).toBe(1);
	});

	test("returns cached value on subsequent accesses", () => {
		let callCount = 0;

		class TestSubject {
			get value(): number {
				callCount++;
				return 42;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy);

		const subject = new TestSubject();
		expect(subject.value).toBe(42);
		expect(subject.value).toBe(42);
		expect(subject.value).toBe(42);
		expect(callCount).toBe(1);
	});

	test("isolates cache per instance", () => {
		let callCount = 0;

		class TestSubject {
			constructor(public _n: number) {}

			get value(): number {
				callCount++;
				return this._n * 2;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy);

		const a = new TestSubject(1);
		const b = new TestSubject(2);

		expect(a.value).toBe(2);
		expect(b.value).toBe(4);
		expect(a.value).toBe(2);
		expect(b.value).toBe(4);
		expect(callCount).toBe(2);
	});

	test("caches falsy values correctly", () => {
		let callCount = 0;

		class TestSubject {
			get value(): null {
				callCount++;
				return null;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy);

		const subject = new TestSubject();
		expect(subject.value).toBeNull();
		expect(subject.value).toBeNull();
		expect(callCount).toBe(1);
	});

	test("caches zero correctly", () => {
		let callCount = 0;

		class TestSubject {
			get value(): number {
				callCount++;
				return 0;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy);

		const subject = new TestSubject();
		expect(subject.value).toBe(0);
		expect(subject.value).toBe(0);
		expect(callCount).toBe(1);
	});

	test("getter receives correct this context", () => {
		class TestSubject {
			multiplier = 3;

			get computed(): number {
				return this.multiplier * 10;
			}
		}

		applyGetter(TestSubject.prototype, "computed", lazy);

		const subject = new TestSubject();
		expect(subject.computed).toBe(30);
	});

	test("supports factory form lazy()", () => {
		let callCount = 0;

		class TestSubject {
			get value(): number {
				callCount++;
				return 99;
			}
		}

		applyGetter(TestSubject.prototype, "value", lazy());

		const subject = new TestSubject();
		expect(subject.value).toBe(99);
		expect(subject.value).toBe(99);
		expect(callCount).toBe(1);
	});

	test("throws when applied to a method (non-getter descriptor)", () => {
		class TestSubject {
			method(): number {
				return 1;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(TestSubject.prototype, "method")!;
		expect(() => lazy(TestSubject.prototype, "method", desc)).toThrow("@lazy is applicable only on getters.");
	});

	test("multiple lazy getters on one class are independently cached", () => {
		let aCount = 0;
		let bCount = 0;

		class TestSubject {
			get a(): number {
				aCount++;
				return 1;
			}

			get b(): number {
				bCount++;
				return 2;
			}
		}

		applyGetter(TestSubject.prototype, "a", lazy);
		applyGetter(TestSubject.prototype, "b", lazy);

		const subject = new TestSubject();
		expect(subject.a).toBe(1);
		expect(subject.b).toBe(2);
		expect(subject.a).toBe(1);
		expect(subject.b).toBe(2);
		expect(aCount).toBe(1);
		expect(bCount).toBe(1);
	});
});
