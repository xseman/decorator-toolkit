import {
	describe,
	expect,
	test,
} from "bun:test";

import { bind } from "../bind/bind.js";
import { cache } from "../cache/cache.js";
import { sleep } from "../common/utils.js";
import { retry } from "../retry/retry.js";
import { runOnce } from "../run-once/run-once.js";
import { timeout } from "../timeout/timeout.js";
import { legacy } from "./legacy.js";

/** What TypeScript's `__decorate` helper does under `experimentalDecorators`. */
function decorate(target: object, key: string, decorator: MethodDecorator): void {
	const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
	Object.defineProperty(target, key, decorator(target, key, descriptor) ?? descriptor);
}

describe("legacy", () => {
	test("adapts a factory decorator", async () => {
		class Subject {
			calls = 0;

			fetch(): Promise<string> {
				this.calls += 1;
				return this.calls < 3 ? Promise.reject(new Error("no")) : Promise.resolve("yes");
			}
		}

		decorate(Subject.prototype, "fetch", legacy(retry({ retries: 2, delay: 1 })));

		const subject = new Subject();
		expect(await subject.fetch()).toBe("yes");
		expect(subject.calls).toBe(3);
	});

	test("adapts a bare decorator and keeps per-instance state", () => {
		class Subject {
			calls = 0;

			compute(x: number): number {
				this.calls += 1;
				return x + this.calls;
			}
		}

		decorate(Subject.prototype, "compute", legacy(cache));

		const first = new Subject();
		const second = new Subject();
		expect(first.compute(1)).toBe(2);
		expect(first.compute(1)).toBe(2);
		expect(second.compute(1)).toBe(2);
		expect(first.calls).toBe(1);
		expect(second.calls).toBe(1);
	});

	test("adapts static methods", async () => {
		class Subject {
			static async slow(): Promise<void> {
				await sleep(50);
			}
		}

		decorate(Subject, "slow", legacy(timeout(10)));

		const error = await Subject.slow().catch((caught) => caught);
		expect((error as DOMException).name).toBe("TimeoutError");
	});

	test("reports the standard context to the wrapped decorator", () => {
		let seen: ClassMethodDecoratorContext | undefined;

		class Subject {
			foo(): void {
			}

			static bar(): void {
			}
		}

		decorate(
			Subject.prototype,
			"foo",
			legacy((_value, context) => {
				seen = context;
			}),
		);
		expect(seen).toMatchObject({ kind: "method", name: "foo", static: false, private: false });

		decorate(
			Subject,
			"bar",
			legacy((_value, context) => {
				seen = context;
			}),
		);
		expect(seen).toMatchObject({ kind: "method", name: "bar", static: true });
	});

	test("throws for decorators that need addInitializer", () => {
		class Subject {
			foo(): void {
			}
		}

		expect(() => decorate(Subject.prototype, "foo", legacy(bind))).toThrow("needs addInitializer");
	});

	test("throws when used on a non-method", () => {
		class Subject {
			get foo(): number {
				return 1;
			}
		}

		expect(() => decorate(Subject.prototype, "foo", legacy(runOnce))).toThrow("@legacy is applicable only on methods.");
	});
});
