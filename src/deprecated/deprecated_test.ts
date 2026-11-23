import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { deprecated } from "./deprecated.js";

describe("deprecated", () => {
	test("throws when used on a field", () => {
		const invalidDeprecated: any = deprecated;

		expect(() => {
			class TestSubject {
				@invalidDeprecated
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@deprecated is applicable only on methods.");
	});

	test("warns once per method across instances and still calls it", () => {
		const warnSpy = spyOn(console, "warn").mockImplementation(() => undefined);

		class TestSubject {
			@deprecated
			oldLoad(id: number): string {
				return `user:${id}`;
			}

			@deprecated("Use load() instead.")
			oldSave(): string {
				return "saved";
			}
		}

		const results = [new TestSubject().oldLoad(1), new TestSubject().oldLoad(2), new TestSubject().oldSave()];
		const warnings = warnSpy.mock.calls.map((call) => call[0]).filter((text) => String(text).startsWith("old"));
		warnSpy.mockRestore();

		expect(results).toEqual(["user:1", "user:2", "saved"]);
		expect(warnings).toEqual(["oldLoad() is deprecated.", "oldSave() is deprecated. Use load() instead."]);
	});
});
