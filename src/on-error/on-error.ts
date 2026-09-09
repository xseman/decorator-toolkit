import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type OnErrorHandler<Return = unknown, Args extends unknown[] = unknown[]> = (
	error: unknown,
	args: Args,
) => Return | Promise<Awaited<Return>>;

export type OnErrorDecorator<This = any, Return = unknown, Args extends unknown[] = unknown[]> = Dual<
	(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/** Fallback: a thrown error or rejection is passed to `handler`, whose result becomes the return value. */
export function onError<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	handler: OnErrorHandler<Return, Args> | keyof This,
): OnErrorDecorator<This, Return, Args> {
	return methodDecorator("onError", (value) =>
		function(this: This, ...args: unknown[]): unknown {
			const handle = resolveCallable<This, unknown>(this, handler) as OnErrorHandler;

			try {
				const result = value.apply(this, args);
				return isPromise(result) ? result.catch((error) => handle(error, args)) : result;
			} catch (error) {
				return handle(error, args);
			}
		});
}
