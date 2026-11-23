import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import {
	isObject,
	perInstance,
} from "../common/state.js";
import type { Method } from "../common/types.js";
import {
	argsKey,
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type KeyResolver<Args extends unknown[] = unknown[]> = (...args: Args) => string;

export interface CacheConfig<This = any, Args extends unknown[] = unknown[]> {
	ttlMs?: number;
	/** Keeps at most this many keys per instance and evicts the least recently used one. Default: unlimited. */
	max?: number;
	/** Default key: a single non-string primitive argument itself, otherwise `JSON.stringify(args)`. */
	keyResolver?: KeyResolver<Args> | keyof This;
}

export type CacheDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

type Entry = { value: unknown; expiresAt: number; };
type Store = Map<unknown, Entry>;

const stores = new WeakMap<object, Array<{ method: PropertyKey; store: Store; }>>();

/**
 * Drops the cached results of `method` on `instance` (the class, for static methods),
 * or of every `@cache` method when no name is given. A call still in flight keeps
 * its promise but is not stored again.
 */
export function clearCache(instance: object, method?: string | symbol): void {
	for (const cached of stores.get(instance) ?? []) {
		if (method === undefined || cached.method === method) {
			cached.store.clear();
		}
	}
}

/**
 * Memoizes results per instance, keyed by arguments. Works for async methods too:
 * the promise is cached (so concurrent calls share it), its TTL starts when it
 * resolves, and it is evicted if it rejects.
 */
export function cache<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function cache(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function cache<This = any, Args extends unknown[] = unknown[]>(
	input?: number | CacheConfig<This, Args>,
): CacheDecorator<This, Args>;
export function cache(...args: unknown[]): unknown {
	return overloaded(args, (input?: number | CacheConfig) =>
		methodDecorator<CacheDecorator>("cache", (value, context) => {
			const { ttlMs = Infinity, max = Infinity, keyResolver } = typeof input === "number" ? { ttlMs: input } : input ?? {};
			if (max !== Infinity && (!Number.isInteger(max) || max < 1)) {
				throw new Error("@cache: max must be a positive integer.");
			}

			const slot = perInstance((self) => {
				const store: Store = new Map();

				// an unbound call has no instance to clear the cache through
				if (isObject(self)) {
					const registered = stores.get(self) ?? [];
					registered.push({ method: context.name, store: store });
					stores.set(self, registered);
				}

				return store;
			});

			return function(this: any, ...callArgs: unknown[]): unknown {
				const store = slot(this);
				const key = keyResolver === undefined
					? argsKey(callArgs)
					: resolveCallable<any, string>(this, keyResolver)(...callArgs);
				const now = performance.now();
				const hit = store.get(key);

				if (hit !== undefined && hit.expiresAt > now) {
					// moved to the end, so the first key is always the least recently used one
					store.delete(key);
					store.set(key, hit);

					return hit.value;
				}

				// ponytail: O(n) sweep on miss; index by expiry if stores get large
				for (const [storedKey, entry] of store) {
					if (entry.expiresAt <= now) {
						store.delete(storedKey);
					}
				}

				const result = value.apply(this, callArgs);
				// a pending promise never expires, so concurrent callers share it even when ttlMs is shorter than the call
				const entry: Entry = { value: result, expiresAt: isPromise(result) ? Infinity : now + ttlMs };
				store.set(key, entry);

				if (store.size > max) {
					const leastRecentlyUsed = store.keys().next().value;
					store.delete(leastRecentlyUsed);
				}

				if (isPromise(result)) {
					const resolved = (): void => {
						entry.expiresAt = performance.now() + ttlMs;
					};

					const rejected = (): void => {
						if (store.get(key) === entry) {
							store.delete(key);
						}
					};

					result.then(resolved, rejected);
				}

				return result;
			};
		}));
}
