import {
	describe,
	expect,
	test,
} from "bun:test";

import { readonly } from "./readonly_legacy.js";

function applyAccessor(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy readonly", () => {
	test("throws when used on a method", () => {
		class Subject {
			getValue(): number {
				return 42;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "getValue")!;

		expect(() => readonly(Subject.prototype, "getValue", desc)).toThrow(
			"@readonly is applicable only on accessors.",
		);
	});

	test("throws on set (bare — direct call)", () => {
		class Subject {
			private _x = 42;

			get x(): number {
				return this._x;
			}

			set x(_v: number) {
				this._x = _v;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "x")!;
		const result = readonly(Subject.prototype, "x", desc);
		if (result) Object.defineProperty(Subject.prototype, "x", result);

		const s = new Subject();
		expect(s.x).toBe(42);
		expect(() => {
			s.x = 99;
		}).toThrow(TypeError);
	});

	test("throws on set (factory form)", () => {
		class Subject {
			private _y = 7;

			get y(): number {
				return this._y;
			}

			set y(_v: number) {
				this._y = _v;
			}
		}

		applyAccessor(Subject.prototype, "y", readonly());

		const s = new Subject();
		expect(s.y).toBe(7);
		expect(() => {
			s.y = 1;
		}).toThrow(TypeError);
	});

	test("error message includes property name", () => {
		class Subject {
			private _z = 0;

			get z(): number {
				return this._z;
			}

			set z(_v: number) {
				this._z = _v;
			}
		}

		applyAccessor(Subject.prototype, "z", readonly());

		const s = new Subject();
		expect(() => {
			s.z = 1;
		}).toThrow("Cannot assign to read only property 'z'");
	});
});
