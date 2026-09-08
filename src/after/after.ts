import { assertMethodDecorator } from "../common/decorators.js";
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

/** Runs `hook` (a function or the name of a method on the instance) after the decorated method. */
export function after<This = any, Response = unknown, Args extends unknown[] = unknown[]>(
	hook: AfterFunc<Response, Args> | keyof This,
	options: AfterOptions = {},
) {
	return function<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("after", value, context);

		return function(this: This, ...args: Args): Return {
			const afterFunc = resolveCallable<This, unknown>(this, hook) as AfterFunc<unknown, Args>;
			const response = value.apply(this, args);

			if (options.wait && isPromise(response)) {
				return response.then((resolved) => {
					afterFunc({ args, response: resolved });
					return resolved;
				}) as Return;
			}

			afterFunc({ args, response });
			return response;
		};
	};
}
