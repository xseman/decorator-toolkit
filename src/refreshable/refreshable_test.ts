import {
	describe,
	expect,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import { refreshable } from "./refreshable.js";

describe("refreshable", () => {
	test("unrefs interval handlers and refreshes accessor values", async () => {
		const originalSetInterval = globalThis.setInterval;
		let unrefCalls = 0;
		let fooCounter = 0;
		let gooCounter = 0;

		globalThis.setInterval = ((handler: Parameters<typeof setInterval>[0], timeout?: number, ...args: unknown[]) => {
			const intervalHandler = (originalSetInterval as (...callArgs: unknown[]) => ReturnType<typeof setInterval>)(
				handler,
				timeout,
				...args,
			);
			const trackedIntervalHandler = intervalHandler as ReturnType<typeof setInterval> & {
				unref?: () => unknown;
			};
			const originalUnref = trackedIntervalHandler.unref;

			if (typeof originalUnref === "function") {
				Object.defineProperty(intervalHandler, "unref", {
					configurable: true,
					value: () => {
						unrefCalls += 1;
						return originalUnref.call(intervalHandler);
					},
					writable: true,
				});
			}

			return intervalHandler;
		}) as typeof setInterval;

		try {
			class TestSubject {
				@refreshable<TestSubject, number>({
					dataProvider: async function(this: TestSubject): Promise<number> {
						const value = fooCounter;
						fooCounter += 1;
						return value;
					},
					intervalMs: 50,
				})
				accessor prop: number | null = 9;

				@refreshable<TestSubject, number>({
					dataProvider: async function(this: TestSubject): Promise<number> {
						const value = gooCounter;
						gooCounter += 1;
						return value;
					},
					intervalMs: 50,
				})
				accessor proop: number | null = 4;
			}

			const subject = new TestSubject();
			await sleep(10);
			expect(unrefCalls).toBe(2);
			expect(subject.prop).toBe(0);
			expect(subject.proop).toBe(0);

			await sleep(60);
			expect(subject.prop).toBe(1);
			expect(subject.proop).toBe(1);

			subject.prop = null;
			subject.proop = 100;

			await sleep(50);
			expect(subject.prop as number | null).toBe(1);
			expect(subject.proop).toBe(2);

			subject.proop = null;
		} finally {
			globalThis.setInterval = originalSetInterval;
		}
	});

	test("throws when used on a field instead of an accessor", () => {
		const invalidRefreshable: any = refreshable({
			dataProvider: async () => 0,
			intervalMs: 50,
		});

		expect(() => {
			class TestSubject {
				@invalidRefreshable
				prop = 1;
			}

			return TestSubject;
		}).toThrow("@refreshable is applicable only on accessors.");
	});
});
