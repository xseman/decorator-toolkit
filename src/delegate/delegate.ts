import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

export type DelegateDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

/** Singleflight: concurrent calls with the same key share one in-flight promise. Default key is `JSON.stringify(args)`. */
export function delegate<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function delegate(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function delegate<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
): DelegateDecorator<This, Args>;
export function delegate(...args: unknown[]): unknown {
	return overloaded(args, (keyResolver?: ((...args: unknown[]) => string) | PropertyKey) =>
		methodDecorator<DelegateDecorator>("delegate", (value) => {
			const slot = perInstance(() => new Map<string, Promise<unknown>>());

			return function(this: any, ...callArgs: unknown[]): Promise<unknown> {
				const pending = slot(this);
				const key = keyResolver === undefined
					? JSON.stringify(callArgs)
					: resolveCallable<any, string>(this, keyResolver)(...callArgs);

				let promise = pending.get(key);
				if (promise === undefined) {
					promise = (value.apply(this, callArgs) as Promise<unknown>).finally(() => pending.delete(key));
					pending.set(key, promise);
				}

				return promise;
			};
		}));
}
