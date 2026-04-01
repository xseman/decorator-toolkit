import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";
import type {
	KeyResolver,
	SyncCache,
} from "../memoize/memoize.js";

export interface AsyncCache<Value> {
	set: (key: string, value: Value) => Promise<unknown>;
	get: (key: string) => Promise<Value | null | undefined>;
	delete: (key: string) => Promise<unknown>;
	has: (key: string) => Promise<boolean>;
}

export interface AsyncMemoizeConfig<This = any, Value = unknown, Args extends unknown[] = unknown[]> {
	cache?: SyncCache<Value> | AsyncCache<Value>;
	keyResolver?: KeyResolver<Args> | keyof This;
	expirationTimeMs?: number;
}

type MemoizeAsyncDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

type AsyncCacheLike<Value> = SyncCache<Value> | AsyncCache<Value>;

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

function normalizeMemoizeAsyncInput<This, Value, Args extends unknown[]>(
	input?: AsyncMemoizeConfig<This, Value, Args> | number,
): AsyncMemoizeConfig<This, Value, Args> {
	if (typeof input === "number") {
		return {
			expirationTimeMs: input,
		};
	}

	return input ?? {};
}

function scheduleAsyncExpiration<Value>(cache: AsyncCacheLike<Value>, key: string, expirationTimeMs: number): void {
	setTimeout(() => {
		void Promise.resolve(cache.delete(key)).catch(() => {
			return undefined;
		});
	}, expirationTimeMs);
}

async function cacheHas<Value>(cache: AsyncCacheLike<Value>, key: string): Promise<boolean> {
	return Promise.resolve(cache.has(key));
}

async function cacheGet<Value>(cache: AsyncCacheLike<Value>, key: string): Promise<Value | null | undefined> {
	return Promise.resolve(cache.get(key));
}

async function cacheSet<Value>(cache: AsyncCacheLike<Value>, key: string, value: Value): Promise<void> {
	await Promise.resolve(cache.set(key, value));
}

function createMemoizedAsyncMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	input?: AsyncMemoizeConfig<This, Return, Args> | number,
): AsyncMethod<This, Args, Return> {
	const resolvedConfig = normalizeMemoizeAsyncInput(input);
	const cachesByInstance = new WeakMap<object, AsyncCacheLike<Return>>();
	const pendingByInstance = new WeakMap<object, Map<string, Promise<Return>>>();
	const fallbackCache: AsyncCacheLike<Return> = resolvedConfig.cache ?? new Map<string, Return>();
	const fallbackPending = new Map<string, Promise<Return>>();

	const getCache = (instance: This): AsyncCacheLike<Return> => {
		if (resolvedConfig.cache !== undefined) {
			return resolvedConfig.cache;
		}

		if (!isWeakMapKey(instance)) {
			return fallbackCache;
		}

		const instanceKey = instance as object;
		const existingCache = cachesByInstance.get(instanceKey);
		if (existingCache !== undefined) {
			return existingCache;
		}

		const cache = new Map<string, Return>();
		cachesByInstance.set(instanceKey, cache);
		return cache;
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
		const cache = getCache(this);
		const pending = getPending(this);
		const key = resolveCacheKey(this, resolvedConfig.keyResolver, args);

		const pendingPromise = pending.get(key);
		if (pendingPromise !== undefined) {
			return pendingPromise;
		}

		const promise = (async (): Promise<Return> => {
			const inCache = await cacheHas(cache, key);
			if (inCache) {
				return await cacheGet(cache, key) as Return;
			}

			const data = await originalMethod.apply(this, args);
			await cacheSet(cache, key, data);

			if (resolvedConfig.expirationTimeMs !== undefined) {
				scheduleAsyncExpiration(cache, key, resolvedConfig.expirationTimeMs);
			}

			return data;
		})().finally(() => {
			pending.delete(key);
		});

		pending.set(key, promise);
		return promise;
	};
}

export function memoizeAsync<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	value: AsyncMethod<This, Args, Value>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Value>>,
): AsyncMethod<This, Args, Value>;
export function memoizeAsync<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	input?: AsyncMemoizeConfig<This, Value, Args> | number,
): MemoizeAsyncDecorator;
export function memoizeAsync(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
		input?: AsyncMemoizeConfig<This, Return, Args> | number,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("memoizeAsync", value, decoratorContext);
		return createMemoizedAsyncMethod(value, input as AsyncMemoizeConfig<This, Return, Args> | number);
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
		return decorate(value, decoratorContext, inputOrValue as AsyncMemoizeConfig<This, Return, Args> | number | undefined);
	};
}
