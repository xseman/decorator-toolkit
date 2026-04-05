import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type ReportFunction<Result = unknown, Args extends unknown[] = unknown[]> = (data: ExactTimeReportData<Result, Args>) => unknown;

export interface ExactTimeReportData<Result = unknown, Args extends unknown[] = unknown[]> {
	args: Args;
	result: Result;
	execTime: number;
}

const defaultReporter: ReportFunction = (data): void => {
	console.info(data.execTime);
};

type ExecTimeDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => Method<This, Args, Return>;

export function createExecTimeMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	arg?: ReportFunction<Awaited<Return>, Args> | keyof This,
): Method<This, Args, Return> {
	const input = arg ?? defaultReporter;

	return function(this: This, ...args: Args): Return {
		const reporter = resolveCallable<This, unknown>(this, input);
		const start = Date.now();
		const result = originalMethod.apply(this, args);

		if (isPromise(result)) {
			return Promise.resolve(result).then((resolvedResult) => {
				reporter({
					args,
					result: resolvedResult,
					execTime: Date.now() - start,
				});
				return resolvedResult;
			}) as Return;
		}

		reporter({
			args,
			result,
			execTime: Date.now() - start,
		});
		return result;
	};
}

export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	arg?: ReportFunction<Awaited<Return>, Args> | keyof This,
): ExecTimeDecorator;
export function execTime(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
		reporterArg?: ReportFunction<Awaited<Return>, Args> | keyof This,
	): Method<This, Args, Return> => {
		assertMethodDecorator("execTime", value, decoratorContext);
		return createExecTimeMethod(value, reporterArg);
	};

	if (arguments.length === 2 && isDecoratorCall(context)) {
		return decorate(
			inputOrValue as Method<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, Method<any, unknown[], unknown>>,
		);
	}

	const reporterArg = inputOrValue as ReportFunction<unknown, unknown[]> | PropertyKey | undefined;
	return <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> => {
		return decorate(value, decoratorContext, reporterArg as ReportFunction<Awaited<Return>, Args> | keyof This | undefined);
	};
}
