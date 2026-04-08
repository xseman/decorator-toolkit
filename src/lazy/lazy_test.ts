import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { lazy } from "./lazy.js";

describe("lazy", () => {
	test("computes value on first access", () => {
		let callCount = 0;

		class TestSubject {
			@lazy
			get value(): number {
				callCount++;
				return 42;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBe(42);
		expect(callCount).toBe(1);
	});

	test("returns cached value on subsequent accesses", () => {
		let callCount = 0;

		class TestSubject {
			@lazy
			get value(): number {
				callCount++;
				return 42;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBe(42);
		expect(subject.value).toBe(42);
		expect(subject.value).toBe(42);
		expect(callCount).toBe(1);
	});

	test("isolates cache per instance", () => {
		let callCount = 0;

		class TestSubject {
			constructor(private _n: number) {}

			@lazy
			get value(): number {
				callCount++;
				return this._n * 2;
			}
		}

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
			@lazy
			get value(): null {
				callCount++;
				return null;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBeNull();
		expect(subject.value).toBeNull();
		expect(callCount).toBe(1);
	});

	test("caches zero correctly", () => {
		let callCount = 0;

		class TestSubject {
			@lazy
			get value(): number {
				callCount++;
				return 0;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBe(0);
		expect(subject.value).toBe(0);
		expect(callCount).toBe(1);
	});

	test("getter receives correct this context", () => {
		class TestSubject {
			multiplier = 3;

			@lazy
			get computed(): number {
				return this.multiplier * 10;
			}
		}

		const subject = new TestSubject();
		expect(subject.computed).toBe(30);
	});

	test("supports factory form @lazy()", () => {
		let callCount = 0;

		class TestSubject {
			@lazy()
			get value(): number {
				callCount++;
				return 99;
			}
		}

		const subject = new TestSubject();
		expect(subject.value).toBe(99);
		expect(subject.value).toBe(99);
		expect(callCount).toBe(1);
	});

	test("throws when applied to a method", () => {
		const invalidLazy: any = lazy;

		expect(() => {
			class TestSubject {
				@invalidLazy
				method(): number {
					return 1;
				}
			}

			return TestSubject;
		}).toThrow("@lazy is applicable only on getters.");
	});

	test("throws when applied to a field", () => {
		const invalidLazy: any = lazy;

		expect(() => {
			class TestSubject {
				@invalidLazy
				prop = 2;
			}

			return TestSubject;
		}).toThrow("@lazy is applicable only on getters.");
	});

	test("works with subclasses — each subclass instance has own cache", () => {
		let callCount = 0;

		class Base {
			@lazy
			get value(): string {
				callCount++;
				return "base";
			}
		}

		class Child extends Base {}

		const parent = new Base();
		const child = new Child();

		expect(parent.value).toBe("base");
		expect(child.value).toBe("base");
		expect(callCount).toBe(2);

		// Second access uses cache for each
		expect(parent.value).toBe("base");
		expect(child.value).toBe("base");
		expect(callCount).toBe(2);
	});

	test("multiple lazy getters on one class are independently cached", () => {
		let aCount = 0;
		let bCount = 0;

		class TestSubject {
			@lazy
			get a(): number {
				aCount++;
				return 1;
			}

			@lazy
			get b(): number {
				bCount++;
				return 2;
			}
		}

		const subject = new TestSubject();
		expect(subject.a).toBe(1);
		expect(subject.b).toBe(2);
		expect(subject.a).toBe(1);
		expect(subject.b).toBe(2);
		expect(aCount).toBe(1);
		expect(bCount).toBe(1);
	});
});
