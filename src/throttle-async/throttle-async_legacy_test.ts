import {
	describe,
	expect,
	test,
} from "bun:test";
import { throttleAsync } from "./throttle-async_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy throttleAsync", () => {
	test("limits concurrent executions (bare — direct call)", async () => {
		let concurrent = 0;
		let maxConcurrent = 0;

		class Subject {
			async fetch(): Promise<string> {
				concurrent += 1;
				maxConcurrent = Math.max(maxConcurrent, concurrent);
				await new Promise((res) => setTimeout(res, 10));
				concurrent -= 1;
				return "done";
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "fetch")!;
		const result = (throttleAsync as any)(Subject.prototype, "fetch", desc);
		if (result) Object.defineProperty(Subject.prototype, "fetch", result);

		const s = new Subject();
		await Promise.all([s.fetch(), s.fetch(), s.fetch()]);
		expect(maxConcurrent).toBe(1);
	});

	test("limits concurrent executions (factory)", async () => {
		let concurrent = 0;
		let maxConcurrent = 0;

		class Subject {
			async fetch(): Promise<string> {
				concurrent += 1;
				maxConcurrent = Math.max(maxConcurrent, concurrent);
				await new Promise((res) => setTimeout(res, 10));
				concurrent -= 1;
				return "done";
			}
		}

		apply(Subject.prototype, "fetch", throttleAsync(2));

		const s = new Subject();
		await Promise.all([s.fetch(), s.fetch(), s.fetch(), s.fetch()]);
		expect(maxConcurrent).toBe(2);
	});
});
