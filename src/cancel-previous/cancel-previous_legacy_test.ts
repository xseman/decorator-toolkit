import {
	describe,
	expect,
	test,
} from "bun:test";
import {
	CanceledPromise,
	cancelPrevious,
} from "./cancel-previous_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy cancelPrevious", () => {
	test("cancels preceding call (bare — direct call with descriptor)", async () => {
		class Subject {
			async fetch(): Promise<string> {
				await new Promise((res) => setTimeout(res, 20));
				return "done";
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "fetch")!;
		const result = (cancelPrevious as any)(Subject.prototype, "fetch", desc);
		if (result) Object.defineProperty(Subject.prototype, "fetch", result);

		const s = new Subject();
		const first = s.fetch();
		const second = s.fetch();

		await expect(first).rejects.toBeInstanceOf(CanceledPromise);
		expect(await second).toBe("done");
	});

	test("cancels preceding call (factory form)", async () => {
		class Subject {
			async fetch(): Promise<string> {
				await new Promise((res) => setTimeout(res, 20));
				return "done";
			}
		}

		apply(Subject.prototype, "fetch", cancelPrevious());

		const s = new Subject();
		const first = s.fetch();
		const second = s.fetch();

		await expect(first).rejects.toBeInstanceOf(CanceledPromise);
		expect(await second).toBe("done");
	});
});
