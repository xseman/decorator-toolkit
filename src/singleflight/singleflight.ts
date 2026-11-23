import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";
import {
	argsKey,
	resolveCallable,
} from "../common/utils.js";

export type SingleflightDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

/** Concurrent calls on one instance with the same key share one in-flight promise. Default key: a single non-string primitive argument itself, otherwise `JSON.stringify(args)`. */
export function singleflight<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function singleflight(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function singleflight<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
): SingleflightDecorator<This, Args>;
export function singleflight(...args: unknown[]): unknown {
	return overloaded(args, (keyResolver?: ((...args: unknown[]) => string) | PropertyKey) =>
		methodDecorator<SingleflightDecorator>("singleflight", (value) => {
			const slot = perInstance(() => new Map<unknown, Promise<unknown>>());

			return function(this: any, ...callArgs: unknown[]): Promise<unknown> {
				const pending = slot(this);
				const key = keyResolver === undefined
					? argsKey(callArgs)
					: resolveCallable<any, string>(this, keyResolver)(...callArgs);

				let promise = pending.get(key);
				if (promise === undefined) {
					// started inside the executor so a synchronous throw rejects instead of escaping
					const started = new Promise<unknown>((start) => start(value.apply(this, callArgs)));
					promise = started.finally(() => pending.delete(key));
					pending.set(key, promise);
				}

				return promise;
			};
		}));
}
