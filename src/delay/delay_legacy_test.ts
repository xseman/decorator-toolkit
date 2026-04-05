import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { delay } from "./delay_legacy.js";

describe("legacy delay", () => {
	test("delays method execution", async () => {
		const calls: number[] = [];

		class Subject {
			record(n: number): void {
				calls.push(n);
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "record")!;
		const result = delay(20)(Subject.prototype, "record", desc);
		if (result) Object.defineProperty(Subject.prototype, "record", result);

		new Subject().record(1);
		expect(calls).toHaveLength(0);
		await sleep(30);
		expect(calls).toEqual([1]);
	});
});
