import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	type ExactTimeReportData,
	execTime,
} from "./exec-time.js";

describe("exec-time", () => {
	test("throws when used on a field", () => {
		const invalidExecTime: any = execTime;

		expect(() => {
			class TestSubject {
				@invalidExecTime
				boo = "nope";
			}

			return TestSubject;
		}).toThrow("@execTime is applicable only on methods.");
	});

	test("reports sync method execution", () => {
		const reports: Array<ExactTimeReportData<string, [string]>> = [];
		const reporter = (data: ExactTimeReportData<string, [string]>): void => {
			reports.push(data);
		};

		class TestSubject {
			@execTime<TestSubject, string, [string]>(reporter)
			foo(x: string): string {
				return `${x}b`;
			}
		}

		const result = new TestSubject().foo("a");
		expect(result).toBe("ab");
		expect(reports).toHaveLength(1);
		expect(reports[0].args).toEqual(["a"]);
		expect(reports[0].result).toBe("ab");
		expect(reports[0].execTime).toBeGreaterThanOrEqual(0);
		expect(reports[0].execTime).toBeLessThan(10);
	});

	test("reports async method execution", async () => {
		const reports: Array<ExactTimeReportData<string, [string]>> = [];
		const reporter = (data: ExactTimeReportData<string, [string]>): void => {
			reports.push(data);
		};

		class TestSubject {
			@execTime<TestSubject, Promise<string>, [string]>(reporter)
			async foo(x: string): Promise<string> {
				await sleep(10);
				return `${x}b`;
			}
		}

		const result = await new TestSubject().foo("a");
		expect(result).toBe("ab");
		expect(reports).toHaveLength(1);
		expect(reports[0].args).toEqual(["a"]);
		expect(reports[0].result).toBe("ab");
		expect(reports[0].execTime).toBeGreaterThanOrEqual(8);
		expect(reports[0].execTime).toBeLessThan(30);
	});

	test("uses console.info by default", () => {
		const logSpy = spyOn(console, "info");

		class TestSubject {
			@execTime
			foo(x: string): string {
				return `${x}b`;
			}
		}

		const result = new TestSubject().foo("a");
		expect(result).toBe("ab");
		expect(logSpy.mock.calls).toHaveLength(1);
		expect(typeof logSpy.mock.calls[0][0]).toBe("number");
		logSpy.mockRestore();
	});

	test("uses console.info by default in factory form", () => {
		const logSpy = spyOn(console, "info");

		class TestSubject {
			@execTime()
			foo(x: string): string {
				return `${x}b`;
			}
		}

		const result = new TestSubject().foo("a");
		expect(result).toBe("ab");
		expect(logSpy.mock.calls).toHaveLength(1);
		expect(typeof logSpy.mock.calls[0][0]).toBe("number");
		logSpy.mockRestore();
	});

	test("uses a named reporter", async () => {
		const reports: Array<ExactTimeReportData<string, [string]>> = [];

		class TestSubject {
			report(data: ExactTimeReportData<string, [string]>): void {
				reports.push(data);
			}

			@execTime<TestSubject, Promise<string>, [string]>("report")
			async foo(x: string): Promise<string> {
				await sleep(10);
				return `${x}b`;
			}
		}

		const result = await new TestSubject().foo("a");
		expect(result).toBe("ab");
		expect(reports).toHaveLength(1);
		expect(reports[0].args).toEqual(["a"]);
		expect(reports[0].result).toBe("ab");
	});
});
