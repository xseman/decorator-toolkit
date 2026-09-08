import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface ExactTimeReportData<Result = unknown, Args extends unknown[] = unknown[]> {
	args: Args;
	result: Result;
	/** Milliseconds, from `performance.now()`. */
	execTime: number;
}

export type ReportFunction<Result = unknown, Args extends unknown[] = unknown[]> = (data: ExactTimeReportData<Result, Args>) => unknown;

type ExecTimeDecorator<This = any, Args extends unknown[] = unknown[]> = <Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => Method<This, Args, Return>;

const defaultReporter: ReportFunction = (data) => console.info(data.execTime);

/** Reports how long each call took to `reporter` (default: `console.info`). Async methods are timed until they settle. */
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	reporter?: ReportFunction<Awaited<Return>, Args> | keyof This,
): ExecTimeDecorator<This, Args>;
export function execTime(...args: unknown[]): unknown {
	return overloaded(args, (reporter: ReportFunction | PropertyKey = defaultReporter): ExecTimeDecorator => (value, context) => {
		assertMethodDecorator("execTime", value, context);
		type This = ThisParameterType<typeof value>;
		type Return = ReturnType<typeof value>;

		return function(this: This, ...callArgs: Parameters<typeof value>): Return {
			const report = resolveCallable<This, unknown>(this, reporter as keyof This) as ReportFunction;
			const start = performance.now();
			const result = value.apply(this, callArgs);

			if (isPromise(result)) {
				return result.then((resolved) => {
					report({ args: callArgs, result: resolved, execTime: performance.now() - start });
					return resolved;
				}) as Return;
			}

			report({ args: callArgs, result, execTime: performance.now() - start });
			return result;
		};
	});
}
