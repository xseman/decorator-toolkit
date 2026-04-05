import {
	describe,
	expect,
	test,
} from "bun:test";
import { bindAll } from "./bind-all_legacy.js";

describe("legacy bindAll", () => {
	test("binds all methods to their instance (bare — direct call with constructor)", () => {
		class Subject {
			value = 7;

			getValue(): number {
				return this.value;
			}

			double(): number {
				return this.value * 2;
			}
		}

		const BoundSubject = bindAll(Subject) as typeof Subject;
		const s = new BoundSubject();
		const { getValue, double } = s;
		expect(getValue()).toBe(7);
		expect(double()).toBe(14);
	});

	test("binds all methods to their instance (factory form)", () => {
		class Subject {
			value = 3;

			getValue(): number {
				return this.value;
			}
		}

		const BoundSubject = (bindAll() as (c: typeof Subject) => typeof Subject)(Subject);
		const s = new BoundSubject();
		const { getValue } = s;
		expect(getValue()).toBe(3);
	});

	test("each instance gets its own binding", () => {
		class Counter {
			count = 0;

			inc(): void {
				this.count += 1;
			}
		}

		const BoundCounter = bindAll(Counter) as typeof Counter;
		const a = new BoundCounter();
		const b = new BoundCounter();
		const { inc: incA } = a;
		const { inc: incB } = b;
		incA();
		incA();
		incB();
		expect(a.count).toBe(2);
		expect(b.count).toBe(1);
	});
});
