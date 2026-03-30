import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { throttle } from "./throttle.js";

describe("throttle", () => {
	test("throws when used on a field", () => {
		const invalidThrottle: any = throttle(50);

		expect(() => {
			class TestSubject {
				@invalidThrottle
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@throttle is applicable only on methods.");
	});

	test("throttles invocation", async () => {
		class TestSubject {
			value = 0;

			@throttle(20)
			foo(x: number): void {
				this.goo(x);
			}

			goo(_x: number): void {
				expect(this.value).toBe(3);
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const spy = spyOn(TestSubject.prototype, "goo");

		subject.foo(1);
		expect(spy.mock.calls).toEqual([[1]]);

		await sleep(10);
		subject.foo(2);
		expect(spy.mock.calls).toEqual([[1]]);

		await sleep(30);
		subject.foo(3);
		expect(spy.mock.calls).toEqual([[1], [3]]);
	});

	test("keeps throttle state isolated per instance", async () => {
		class TestSubject {
			@throttle(20)
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
		second.foo();
		expect(firstSpy.mock.calls).toHaveLength(1);
		expect(secondSpy.mock.calls).toHaveLength(1);

		await sleep(10);
		first.foo();
		second.foo();
		expect(firstSpy.mock.calls).toHaveLength(1);
		expect(secondSpy.mock.calls).toHaveLength(1);
	});
});
