import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { delay } from "./delay.js";

describe("delay", () => {
	test("throws when used on a field", () => {
		const invalidDelay: any = delay(50);

		expect(() => {
			class TestSubject {
				@invalidDelay
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@delay is applicable only on methods.");
	});

	test("delays method invocation", async () => {
		class TestSubject {
			value = 0;

			@delay(50)
			foo(x: number): void {
				this.goo(x);
			}

			goo(x: number): void {
				expect(this.value).toBe(3);
				expect(typeof x).toBe("number");
			}
		}

		const subject = new TestSubject();
		subject.value = 3;
		const spy = spyOn(TestSubject.prototype, "goo");

		subject.foo(1);

		await sleep(20);
		expect(spy.mock.calls).toHaveLength(0);

		await sleep(50);
		expect(spy.mock.calls).toHaveLength(1);
		expect(spy.mock.calls[0]).toEqual([1]);

		subject.foo(2);
		await sleep(75);
		expect(spy.mock.calls).toHaveLength(2);
		expect(spy.mock.calls[1]).toEqual([2]);
	});
});
