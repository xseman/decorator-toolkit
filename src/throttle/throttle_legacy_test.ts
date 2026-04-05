import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { throttle } from "./throttle_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy throttle", () => {
	test("throttles calls per instance", async () => {
		class Subject {
			calls = 0;

			tick(): void {
				this.calls += 1;
			}
		}

		apply(Subject.prototype, "tick", throttle(30));

		const s = new Subject();
		s.tick();
		s.tick();
		s.tick();
		expect(s.calls).toBe(1);
		await sleep(40);
		s.tick();
		expect(s.calls).toBe(2);
	});

	test("isolates throttle state per instance", async () => {
		class Subject {
			calls = 0;

			tick(): void {
				this.calls += 1;
			}
		}

		apply(Subject.prototype, "tick", throttle(30));

		const a = new Subject();
		const b = new Subject();
		a.tick();
		b.tick();
		expect(a.calls).toBe(1);
		expect(b.calls).toBe(1);
	});
});
