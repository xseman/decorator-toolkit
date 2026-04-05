import {
	describe,
	expect,
	test,
} from "bun:test";
import { rateLimit } from "./rate-limit_legacy.js";

function apply(proto: object, key: string, decorator: MethodDecorator): void {
	const desc = Object.getOwnPropertyDescriptor(proto, key)!;
	const result = decorator(proto, key, desc);
	if (result) Object.defineProperty(proto, key, result);
}

describe("legacy rateLimit", () => {
	test("allows calls within limit", () => {
		class Subject {
			call(): string {
				return "ok";
			}
		}

		apply(Subject.prototype, "call", rateLimit({ allowedCalls: 3, timeSpanMs: 1000 }));

		const s = new Subject();
		expect(s.call()).toBe("ok");
		expect(s.call()).toBe("ok");
		expect(s.call()).toBe("ok");
	});

	test("throws when limit is exceeded", () => {
		class Subject {
			call(): string {
				return "ok";
			}
		}

		apply(Subject.prototype, "call", rateLimit({ allowedCalls: 1, timeSpanMs: 1000 }));

		const s = new Subject();
		s.call();
		expect(() => s.call()).toThrow("You have acceded the amount of allowed calls");
	});

	test("throws with both counter types provided", () => {
		expect(() => {
			rateLimit({
				allowedCalls: 1,
				timeSpanMs: 100,
				rateLimitCounter: { inc: () => {}, dec: () => {}, getCount: () => 0 },
				rateLimitAsyncCounter: {
					inc: async () => {},
					dec: async () => {},
					getCount: async () => 0,
				},
			});
		}).toThrow();
	});
});
