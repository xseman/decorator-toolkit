import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type OnErrorHandler<Return = unknown, Args extends unknown[] = unknown[]> = (
	error: unknown,
	args: Args,
) => Return | Promise<Awaited<Return>>;

/** Fallback: a thrown error or rejection is passed to `handler`, whose result becomes the return value. */
export function onError<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	handler: OnErrorHandler<Return, Args> | keyof This,
) {
	return function(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("onError", value, context);

		return function(this: This, ...args: Args): Return {
			const handle = resolveCallable<This, Return | Promise<Awaited<Return>>>(this, handler) as OnErrorHandler<Return, Args>;

			try {
				const result = value.apply(this, args);
				return isPromise(result) ? result.catch((error) => handle(error, args)) as Return : result;
			} catch (error) {
				return handle(error, args) as Return;
			}
		};
	};
}
