import {
	describe,
	expect,
	test,
} from "bun:test";
import { delegate } from "./delegate_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy delegate", () => {
	test("deduplicates concurrent calls (bare — direct call with descriptor)", async () => {
		class Subject {
			calls = 0;

			async fetch(): Promise<string> {
				this.calls += 1;
				await new Promise((res) => setTimeout(res, 10));
				return "data";
			}
		}

		const desc = Object.getOwnPropertyDescriptor(Subject.prototype, "fetch")!;
		const result = (delegate as any)(Subject.prototype, "fetch", desc);
		if (result) Object.defineProperty(Subject.prototype, "fetch", result);

		const s = new Subject();
		const [a, b] = await Promise.all([s.fetch(), s.fetch()]);
		expect(a).toBe("data");
		expect(b).toBe("data");
		expect(s.calls).toBe(1);
	});

	test("deduplicates concurrent calls (factory with key resolver)", async () => {
		class Subject {
			calls = 0;

			async fetch(id: string): Promise<string> {
				this.calls += 1;
				await new Promise((res) => setTimeout(res, 10));
				return id;
			}
		}

		apply(Subject.prototype, "fetch", delegate((id: string) => id));

		const s = new Subject();
		const results = await Promise.all([s.fetch("a"), s.fetch("a"), s.fetch("b")]);
		expect(results).toEqual(["a", "a", "b"]);
		expect(s.calls).toBe(2);
	});
});
