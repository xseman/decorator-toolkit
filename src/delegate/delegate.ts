import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

type DelegateDecorator<This = any, Args extends unknown[] = unknown[]> = <Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

/** Singleflight: concurrent calls with the same key share one in-flight promise. Default key is `JSON.stringify(args)`. */
export function delegate<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function delegate<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
): DelegateDecorator<This, Args>;
export function delegate(...args: unknown[]): unknown {
	return overloaded(args, (keyResolver?: ((...args: unknown[]) => string) | PropertyKey): DelegateDecorator =>
	<This, Args extends unknown[], Return>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("delegate", value, context);

		const slot = perInstance(() => new Map<string, Promise<Return>>());

		return function(this: This, ...callArgs: Args): Promise<Return> {
			const pending = slot(this);
			const key = keyResolver === undefined
				? JSON.stringify(callArgs)
				: resolveCallable<This, string>(this, keyResolver as keyof This)(...callArgs);

			let promise = pending.get(key);
			if (promise === undefined) {
				promise = value.apply(this, callArgs).finally(() => pending.delete(key));
				pending.set(key, promise);
			}

			return promise;
		};
	});
}
