import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type KeyResolver<Args extends unknown[] = unknown[]> = (...args: Args) => string;

export interface CacheConfig<This = any, Args extends unknown[] = unknown[]> {
	ttlMs?: number;
	/** Default key is `JSON.stringify(args)`. */
	keyResolver?: KeyResolver<Args> | keyof This;
}

type CacheDecorator<This = any, Args extends unknown[] = unknown[]> = <Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => Method<This, Args, Return>;

type Entry<Value> = { value: Value; expiresAt: number; };

/**
 * Memoizes results per instance, keyed by arguments. Works for async methods too:
 * the promise is cached (so concurrent calls share it) and evicted if it rejects.
 */
export function cache<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function cache<This = any, Args extends unknown[] = unknown[]>(
	input?: number | CacheConfig<This, Args>,
): CacheDecorator<This, Args>;
export function cache(...args: unknown[]): unknown {
	return overloaded(args, (input?: number | CacheConfig): CacheDecorator => (value, context) => {
		assertMethodDecorator("cache", value, context);
		type This = ThisParameterType<typeof value>;
		type Return = ReturnType<typeof value>;

		const { ttlMs = Infinity, keyResolver } = typeof input === "number" ? { ttlMs: input } : input ?? {};
		const slot = perInstance(() => new Map<string, Entry<Return>>());

		return function(this: This, ...callArgs: Parameters<typeof value>): Return {
			const store = slot(this);
			const key = keyResolver === undefined
				? JSON.stringify(callArgs)
				: resolveCallable<This, string>(this, keyResolver)(...callArgs);
			const now = performance.now();
			const hit = store.get(key);

			if (hit !== undefined && hit.expiresAt > now) {
				return hit.value;
			}

			// ponytail: O(n) sweep on miss; index by expiry if stores get large
			for (const [storedKey, entry] of store) {
				if (entry.expiresAt <= now) {
					store.delete(storedKey);
				}
			}

			const result = value.apply(this, callArgs);
			const entry: Entry<Return> = { value: result, expiresAt: now + ttlMs };
			store.set(key, entry);

			if (isPromise(result)) {
				result.catch(() => {
					if (store.get(key) === entry) {
						store.delete(key);
					}
				});
			}

			return result;
		};
	});
}
