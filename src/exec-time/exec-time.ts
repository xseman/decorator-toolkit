import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface ExecTimeReportData<Result = unknown, Args extends unknown[] = unknown[]> {
	args: Args;
	/** Absent when the method threw or rejected. */
	result?: Result;
	/** Present (`"error" in data`) only when the method threw or rejected. */
	error?: unknown;
	/** Milliseconds, from `performance.now()`. */
	execTime: number;
}

export type ReportFunction<Result = unknown, Args extends unknown[] = unknown[]> = (data: ExecTimeReportData<Result, Args>) => unknown;

export type ExecTimeDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

const defaultReporter: ReportFunction = (data) => console.info(data.execTime);

/** Reports how long each call took to `reporter` (default: `console.info`), failed calls included. Async methods are timed until they settle. */
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function execTime(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	reporter?: ReportFunction<Awaited<Return>, Args> | keyof This,
): ExecTimeDecorator<This, Args>;
export function execTime(...args: unknown[]): unknown {
	return overloaded(args, (reporter: ReportFunction | PropertyKey = defaultReporter) =>
		methodDecorator<ExecTimeDecorator>("execTime", (value) =>
			function(this: any, ...callArgs: unknown[]): unknown {
				const report = resolveCallable<any, unknown>(this, reporter) as ReportFunction;
				const start = performance.now();

				const failed = (error: unknown): never => {
					report({ args: callArgs, error: error, execTime: performance.now() - start });
					throw error;
				};

				let result: unknown;
				try {
					result = value.apply(this, callArgs);
				} catch (error) {
					return failed(error);
				}

				if (isPromise(result)) {
					const reported = result.then((resolved) => {
						report({ args: callArgs, result: resolved, execTime: performance.now() - start });
						return resolved;
					}, failed);

					return reported;
				}

				report({ args: callArgs, result: result, execTime: performance.now() - start });
				return result;
			}));
}
