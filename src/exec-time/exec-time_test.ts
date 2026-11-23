import {
	describe,
	expect,
	spyOn,
	test,
} from "bun:test";

import { sleep } from "../common/utils.js";
import {
	execTime,
	type ExecTimeReportData,
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
		const reports: Array<ExecTimeReportData<string, [string]>> = [];
		const reporter = (data: ExecTimeReportData<string, [string]>): void => {
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
		const reports: Array<ExecTimeReportData<string, [string]>> = [];
		const reporter = (data: ExecTimeReportData<string, [string]>): void => {
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
		const logSpy = spyOn(console, "info").mockImplementation(() => undefined);

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
		const logSpy = spyOn(console, "info").mockImplementation(() => undefined);

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
		const reports: Array<ExecTimeReportData<string, [string]>> = [];

		class TestSubject {
			report(data: ExecTimeReportData<string, [string]>): void {
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

	test("reports a call that throws or rejects, then rethrows", async () => {
		const reports: ExecTimeReportData[] = [];
		const reporter = (data: ExecTimeReportData): void => {
			reports.push(data);
		};

		class TestSubject {
			@execTime(reporter)
			syncFailure(): void {
				throw new Error("sync failure");
			}

			@execTime(reporter)
			async asyncFailure(): Promise<void> {
				throw new Error("async failure");
			}
		}

		const subject = new TestSubject();
		expect(() => subject.syncFailure()).toThrow("sync failure");
		await expect(subject.asyncFailure()).rejects.toThrow("async failure");

		expect(reports).toHaveLength(2);
		expect((reports[0].error as Error).message).toBe("sync failure");
		expect((reports[1].error as Error).message).toBe("async failure");
		expect("result" in reports[0]).toBe(false);
		expect(reports[1].execTime).toBeGreaterThanOrEqual(0);
	});
});
