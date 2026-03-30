import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { debounce } from "./debounce.js";

describe("debounce", () => {
	test("throws when used on a field", () => {
		const invalidDebounce: any = debounce(50);

		expect(() => {
			class TestSubject {
				@invalidDebounce
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@debounce is applicable only on methods.");
	});

	test("debounces invocation", async () => {
		class TestSubject {
			value = 0;

			@debounce(30)
			foo(): void {
				this.goo();
			}

			goo(): void {
				expect(this.value).toBe(3);
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const spy = spyOn(TestSubject.prototype, "goo");

		subject.foo();
		expect(spy.mock.calls).toHaveLength(0);

		await sleep(10);
		expect(spy.mock.calls).toHaveLength(0);
		subject.foo();

		await sleep(20);
		expect(spy.mock.calls).toHaveLength(0);

		await sleep(40);
		expect(spy.mock.calls).toHaveLength(1);
	});

	test("passes method parameters", async () => {
		class TestSubject {
			@debounce(5)
			foo(x: number, y: number): void {
				this.goo(x, y);
			}

			goo(_x: number, _y: number): void {
			}
		}

		const subject = new TestSubject();
		const spy = spyOn(TestSubject.prototype, "goo");
		subject.foo(1, 2);

		await sleep(10);
		expect(spy.mock.calls).toEqual([[1, 2]]);
	});

	test("keeps debounce state isolated per instance", async () => {
		class TestSubject {
			@debounce(30)
			foo(): void {
				this.goo();
			}

			goo(): void {
			}
		}

		const first = new TestSubject();
		const second = new TestSubject();
		const firstSpy = spyOn(first, "goo");
		const secondSpy = spyOn(second, "goo");

		first.foo();
		await sleep(10);
		second.foo();

		await sleep(30);
		expect(firstSpy.mock.calls).toHaveLength(1);
		expect(secondSpy.mock.calls).toHaveLength(1);
	});
});
