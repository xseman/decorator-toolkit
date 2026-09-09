import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface AfterParams<Response = unknown, Args extends unknown[] = unknown[]> {
	args: Args;
	response: Response;
}

export type AfterFunc<Response = unknown, Args extends unknown[] = unknown[]> = (params: AfterParams<Response, Args>) => unknown;

export interface AfterOptions {
	/** Run the hook after an async method resolves (with the resolved value) instead of right after the call. */
	wait?: boolean;
}

export type AfterDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/** Runs `hook` (a function or the name of a method on the instance) after the decorated method. */
export function after<This = any, Response = unknown, Args extends unknown[] = unknown[]>(
	hook: AfterFunc<Response, Args> | keyof This,
	options: AfterOptions = {},
): AfterDecorator<This, Args> {
	return methodDecorator("after", (value) =>
		function(this: This, ...args: unknown[]): unknown {
			const afterFunc = resolveCallable<This, unknown>(this, hook) as AfterFunc;
			const response = value.apply(this, args);

			if (options.wait && isPromise(response)) {
				return response.then((resolved) => {
					afterFunc({ args: args, response: resolved });
					return resolved;
				});
			}

			afterFunc({ args: args, response: response });
			return response;
		});
}
