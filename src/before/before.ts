import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface BeforeOptions {
	/** Await an async hook before calling the method. */
	wait?: boolean;
}

/** Runs `hook` (a function or the name of a method on the instance) before the decorated method. */
export function before<This = any>(
	hook: (() => unknown) | keyof This,
	options: BeforeOptions = {},
) {
	return function<Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("before", value, context);

		return function(this: This, ...args: Args): Return {
			const result = resolveCallable<This, unknown>(this, hook)();

			if (options.wait && isPromise(result)) {
				return result.then(() => value.apply(this, args)) as Return;
			}

			return value.apply(this, args);
		};
	};
}
