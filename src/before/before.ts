import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface BeforeOptions {
	/** Await an async hook before calling the method. */
	wait?: boolean;
}

export type BeforeDecorator<This = any> = Dual<
	<Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/** Runs `hook` (a function or the name of a method on the instance) before the decorated method. */
export function before<This = any>(
	hook: (() => unknown) | keyof This,
	options: BeforeOptions = {},
): BeforeDecorator<This> {
	return methodDecorator("before", (value) =>
		function(this: This, ...args: unknown[]): unknown {
			const result = resolveCallable<This, unknown>(this, hook)();

			if (options.wait && isPromise(result)) {
				return result.then(() => value.apply(this, args));
			}

			return value.apply(this, args);
		});
}
