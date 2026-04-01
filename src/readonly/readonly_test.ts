import {
	describe,
	expect,
	test,
} from "bun:test";

import { readonly } from "./readonly.js";

describe("readonly", () => {
	test("throws when assigning to a readonly accessor", () => {
		class TestSubject {
			@readonly
			accessor prop = 2;
		}

		const subject = new TestSubject();
		expect(subject.prop).toBe(2);
		expect(() => {
			subject.prop = 4;
		}).toThrow("Cannot assign to read only property 'prop' of object '#<TestSubject>'");
	});

	test("throws when used on a field", () => {
		const invalidReadonly: any = readonly;

		expect(() => {
			class TestSubject {
				@invalidReadonly
				prop = 2;
			}

			return TestSubject;
		}).toThrow("@readonly is applicable only on accessors.");
	});
});
