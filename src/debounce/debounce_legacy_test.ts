import {
	describe,
	expect,
	test,
} from "bun:test";
import { sleep } from "../common/utils.js";
import { debounce } from "./debounce_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy debounce", () => {
	test("debounces calls per instance", async () => {
		class Subject {
			calls = 0;

			tick(): void {
				this.calls += 1;
			}
		}

		apply(Subject.prototype, "tick", debounce(20));

		const s = new Subject();
		s.tick();
		s.tick();
		s.tick();
		await sleep(30);
		expect(s.calls).toBe(1);
	});

	test("isolates debounce state per instance", async () => {
		class Subject {
			calls = 0;

			tick(): void {
				this.calls += 1;
			}
		}

		apply(Subject.prototype, "tick", debounce(20));

		const a = new Subject();
		const b = new Subject();
		a.tick();
		b.tick();
		await sleep(30);
		expect(a.calls).toBe(1);
		expect(b.calls).toBe(1);
	});
});
