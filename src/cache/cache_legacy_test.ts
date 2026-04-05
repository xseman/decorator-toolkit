import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { cache } from "./cache_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy cache", () => {
	test("caches method results (factory)", () => {
		class Subject {
			calls = 0;

			compute(x: number): number {
				this.calls += 1;
				return x * 2;
			}
		}

		apply(Subject.prototype, "compute", cache({ ttlMs: 50 }));

		const s = new Subject();
		expect(s.compute(3)).toBe(6);
		expect(s.compute(3)).toBe(6);
		expect(s.calls).toBe(1);
	});

	test("caches method results (bare — direct call with descriptor)", () => {
		class Subject {
			calls = 0;

			compute(x: number): number {
				this.calls += 1;
				return x * 2;
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "compute")!;
		const result = (cache as any)(Subject.prototype, "compute", desc);
		if (result) Object.defineProperty(Subject.prototype, "compute", result);

		const s = new Subject();
		expect(s.compute(5)).toBe(10);
		expect(s.compute(5)).toBe(10);
		expect(s.calls).toBe(1);
	});

	test("expires cache after ttl", async () => {
		class Subject {
			calls = 0;

			compute(): number {
				this.calls += 1;
				return 1;
			}
		}

		apply(Subject.prototype, "compute", cache(20));

		const s = new Subject();
		s.compute();
		s.compute();
		expect(s.calls).toBe(1);
		await sleep(30);
		s.compute();
		expect(s.calls).toBe(2);
	});

	test("isolates cache per instance", () => {
		class Subject {
			calls = 0;

			compute(x: number): number {
				this.calls += 1;
				return x;
			}
		}

		apply(Subject.prototype, "compute", cache());

		const a = new Subject();
		const b = new Subject();
		a.compute(1);
		b.compute(1);
		expect(a.calls).toBe(1);
		expect(b.calls).toBe(1);
	});

	test("throws when applied to non-method", () => {
		expect(() => (cache as any)({} as object, "x", { value: 42 })).toThrow(
			"@cache is applicable only on methods.",
		);
	});
});
