import {
	describe,
	expect,
	test,
} from "bun:test";

import { bindAll } from "../bind-all/bind-all.js";
import { bind } from "../bind/bind.js";
import { cache } from "../cache/cache.js";
import { dispose } from "../dispose/dispose.js";
import { lazy } from "../lazy/lazy.js";
import { periodic } from "../periodic/periodic.js";
import { readonly } from "../readonly/readonly.js";
import { retry } from "../retry/retry.js";
import { timeout } from "../timeout/timeout.js";
import { sleep } from "./utils.js";

/** What TypeScript's `__decorate` helper does under `experimentalDecorators`. */
function decorateMember(target: object, key: string, decorator: (...args: any[]) => unknown): void {
	const descriptor = Object.getOwnPropertyDescriptor(target, key);
	const result = decorator(target, key, descriptor) as PropertyDescriptor | undefined;
	if (result) {
		Object.defineProperty(target, key, result);
	}
}

describe("legacy experimentalDecorators call form", () => {
	test("factory decorators wrap the method", async () => {
		class Subject {
			calls = 0;

			fetch(): Promise<string> {
				this.calls += 1;
				return this.calls < 3 ? Promise.reject(new Error("no")) : Promise.resolve("yes");
			}
		}

		decorateMember(Subject.prototype, "fetch", retry({ retries: 2, delay: 1 }));

		const subject = new Subject();
		expect(await subject.fetch()).toBe("yes");
		expect(subject.calls).toBe(3);
	});

	test("bare and factory forms keep per-instance state", () => {
		class Subject {
			calls = 0;

			bare(x: number): number {
				this.calls += 1;
				return x + this.calls;
			}

			factory(x: number): number {
				this.calls += 1;
				return x + this.calls;
			}
		}

		decorateMember(Subject.prototype, "bare", cache);
		decorateMember(Subject.prototype, "factory", cache());

		const first = new Subject();
		const second = new Subject();
		expect(first.bare(1)).toBe(2);
		expect(first.bare(1)).toBe(2);
		expect(first.factory(1)).toBe(3);
		expect(first.factory(1)).toBe(3);
		expect(second.bare(1)).toBe(2);
		expect(first.calls).toBe(2);
		expect(second.calls).toBe(1);
	});

	test("static methods are supported", async () => {
		class Subject {
			static async slow(): Promise<void> {
				await sleep(50);
			}
		}

		decorateMember(Subject, "slow", timeout(10));

		const error = await Subject.slow().catch((caught) => caught);
		expect((error as DOMException).name).toBe("TimeoutError");
	});

	test("a field (undefined descriptor) is rejected with the method error", () => {
		class Subject {
			field = 1;
		}

		expect(() => decorateMember(Subject.prototype, "field", cache)).toThrow("@cache is applicable only on methods.");
	});

	test("bind binds on first access, per instance and for statics", () => {
		class Subject {
			label = "instance";
			static label = "static";

			who(): string {
				return this.label;
			}

			static who(): string {
				return this.label;
			}
		}

		decorateMember(Subject.prototype, "who", bind);
		decorateMember(Subject, "who", bind());

		const subject = new Subject();
		const detached = subject.who;
		const detachedStatic = Subject.who;
		expect(detached()).toBe("instance");
		expect(detachedStatic()).toBe("static");
		expect(subject.who).toBe(detached);
	});

	test("bindAll works with the single-argument class call", () => {
		class Subject {
			label = "bound";

			who(): string {
				return this.label;
			}
		}

		const Bound = bindAll(Subject);
		const BoundFactory = bindAll()(Subject);
		const { who } = new Bound();
		expect(who()).toBe("bound");
		expect(new BoundFactory().who.call(undefined)).toBe("bound");
	});

	test("readonly makes a get/set accessor throw on assignment", () => {
		class Subject {
			#id = "a";

			get id(): string {
				return this.#id;
			}

			set id(value: string) {
				this.#id = value;
			}
		}

		decorateMember(Subject.prototype, "id", readonly);

		const subject = new Subject();
		expect(subject.id).toBe("a");
		expect(() => {
			subject.id = "b";
		}).toThrow("Cannot assign to read only property 'id' of object '#<Subject>'");
		expect(() => decorateMember(Subject.prototype, "constructor", readonly)).toThrow("@readonly is applicable only on accessors.");
	});

	test("lazy caches a getter per instance", () => {
		let computed = 0;

		class Subject {
			get value(): number {
				computed += 1;
				return computed;
			}
		}

		decorateMember(Subject.prototype, "value", lazy);

		const first = new Subject();
		const second = new Subject();
		expect(first.value).toBe(1);
		expect(first.value).toBe(1);
		expect(second.value).toBe(2);
		expect(computed).toBe(2);
	});

	test("dispose wires Symbol.dispose on the prototype in declaration order", () => {
		const order: string[] = [];

		class Subject {
			closeA(): void {
				order.push("a");
			}

			closeB(): void {
				order.push("b");
			}
		}

		decorateMember(Subject.prototype, "closeA", dispose);
		decorateMember(Subject.prototype, "closeB", dispose());

		{
			using _subject = new Subject() as Subject & Disposable;
		}

		expect(order).toEqual(["a", "b"]);
	});

	test("periodic throws a clear error", () => {
		class Subject {
			tick(): void {
			}
		}

		expect(() => decorateMember(Subject.prototype, "tick", periodic(10))).toThrow("needs a class initializer");
	});
});
