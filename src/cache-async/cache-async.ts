import type {
	CacheStore,
	KeyResolver,
} from "../cache/cache.js";
import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";

export interface AsyncCacheStore<Value> {
	set: (key: string, value: Value) => Promise<unknown>;
	get: (key: string) => Promise<Value | null | undefined>;
	delete: (key: string) => Promise<unknown>;
	has: (key: string) => Promise<boolean>;
}

export interface AsyncCacheConfig<This = any, Value = unknown, Args extends unknown[] = unknown[]> {
	store?: CacheStore<Value> | AsyncCacheStore<Value>;
	keyResolver?: KeyResolver<Args> | keyof This;
	ttlMs?: number;
}

type CacheAsyncDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

type AsyncCacheStoreLike<Value> = CacheStore<Value> | AsyncCacheStore<Value>;

function resolveCacheKey<This, Args extends unknown[]>(
	instance: This,
	keyResolver: KeyResolver<Args> | keyof This | undefined,
	args: Args,
): string {
	if (keyResolver === undefined) {
		return JSON.stringify(args);
	}

	return resolveCallable<This, string>(instance, keyResolver)(...args);
}

function normalizeCacheAsyncInput<This, Value, Args extends unknown[]>(
	input?: AsyncCacheConfig<This, Value, Args> | number,
): AsyncCacheConfig<This, Value, Args> {
	if (typeof input === "number") {
		return {
			ttlMs: input,
		};
	}

	return input ?? {};
}

function scheduleAsyncExpiration<Value>(store: AsyncCacheStoreLike<Value>, key: string, ttlMs: number): void {
	setTimeout(() => {
		void Promise.resolve(store.delete(key)).catch(() => {
			return undefined;
		});
	}, ttlMs);
}

async function storeHas<Value>(store: AsyncCacheStoreLike<Value>, key: string): Promise<boolean> {
	return Promise.resolve(store.has(key));
}

async function storeGet<Value>(store: AsyncCacheStoreLike<Value>, key: string): Promise<Value | null | undefined> {
	return Promise.resolve(store.get(key));
}

async function storeSet<Value>(store: AsyncCacheStoreLike<Value>, key: string, value: Value): Promise<void> {
	await Promise.resolve(store.set(key, value));
}

export function createCachedAsyncMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	input?: AsyncCacheConfig<This, Return, Args> | number,
): AsyncMethod<This, Args, Return> {
	const resolvedConfig = normalizeCacheAsyncInput(input);
	const storesByInstance = new WeakMap<object, AsyncCacheStoreLike<Return>>();
	const pendingByInstance = new WeakMap<object, Map<string, Promise<Return>>>();
	const fallbackStore: AsyncCacheStoreLike<Return> = resolvedConfig.store ?? new Map<string, Return>();
	const fallbackPending = new Map<string, Promise<Return>>();

	const getStore = (instance: This): AsyncCacheStoreLike<Return> => {
		if (resolvedConfig.store !== undefined) {
			return resolvedConfig.store;
		}

		if (!isWeakMapKey(instance)) {
			return fallbackStore;
		}

		const instanceKey = instance as object;
		const existingStore = storesByInstance.get(instanceKey);
		if (existingStore !== undefined) {
			return existingStore;
		}

		const store = new Map<string, Return>();
		storesByInstance.set(instanceKey, store);
		return store;
	};

	const getPending = (instance: This): Map<string, Promise<Return>> => {
		if (!isWeakMapKey(instance)) {
			return fallbackPending;
		}

		const instanceKey = instance as object;
		const existingPending = pendingByInstance.get(instanceKey);
		if (existingPending !== undefined) {
			return existingPending;
		}

		const pending = new Map<string, Promise<Return>>();
		pendingByInstance.set(instanceKey, pending);
		return pending;
	};

	return async function(this: This, ...args: Args): Promise<Return> {
		const store = getStore(this);
		const pending = getPending(this);
		const key = resolveCacheKey(this, resolvedConfig.keyResolver, args);

		const pendingPromise = pending.get(key);
		if (pendingPromise !== undefined) {
			return pendingPromise;
		}

		const promise = (async (): Promise<Return> => {
			const inStore = await storeHas(store, key);
			if (inStore) {
				return await storeGet(store, key) as Return;
			}

			const data = await originalMethod.apply(this, args);
			await storeSet(store, key, data);

			if (resolvedConfig.ttlMs !== undefined) {
				scheduleAsyncExpiration(store, key, resolvedConfig.ttlMs);
			}

			return data;
		})().finally(() => {
			pending.delete(key);
		});

		pending.set(key, promise);
		return promise;
	};
}

export function cacheAsync<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	value: AsyncMethod<This, Args, Value>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Value>>,
): AsyncMethod<This, Args, Value>;
export function cacheAsync<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	input?: AsyncCacheConfig<This, Value, Args> | number,
): CacheAsyncDecorator;
export function cacheAsync(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
		input?: AsyncCacheConfig<This, Return, Args> | number,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("cacheAsync", value, decoratorContext);
		return createCachedAsyncMethod(value, input as AsyncCacheConfig<This, Return, Args> | number);
	};

	if (isDecoratorCall(context)) {
		return decorate(
			inputOrValue as AsyncMethod<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, AsyncMethod<any, unknown[], unknown>>,
		);
	}

	return <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> => {
		return decorate(value, decoratorContext, inputOrValue as AsyncCacheConfig<This, Return, Args> | number | undefined);
	};
}
