import {
	describe,
	expect,
	test,
} from "bun:test";
import { execTime } from "./exec-time_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy execTime", () => {
	test("reports execution time to default reporter (bare — direct call)", () => {
		const original = console.info;
		const reports: unknown[] = [];
		console.info = (v: unknown) => reports.push(v);

		try {
			class Subject {
				compute(): number {
					return 1 + 1;
				}
			}

			const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "compute")!;
			const result = (execTime as any)(Subject.prototype, "compute", desc);
			if (result) Object.defineProperty(Subject.prototype, "compute", result);

			new Subject().compute();
			expect(reports).toHaveLength(1);
			expect(typeof reports[0]).toBe("number");
		} finally {
			console.info = original;
		}
	});

	test("calls provided reporter (factory)", () => {
		const reports: unknown[] = [];

		class Subject {
			compute(): number {
				return 42;
			}
		}

		apply(Subject.prototype, "compute", execTime((data) => reports.push(data)));

		new Subject().compute();
		expect(reports).toHaveLength(1);
		expect((reports[0] as any).result).toBe(42);
	});
});
