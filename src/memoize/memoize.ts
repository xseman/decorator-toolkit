import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";

export type KeyResolver<Args extends unknown[] = unknown[]> = (...args: Args) => string;

export interface SyncCache<Value> {
	set: (key: string, value: Value) => unknown;
	get: (key: string) => Value | null | undefined;
	delete: (key: string) => unknown;
	has: (key: string) => boolean;
}

export interface MemoizeConfig<This = any, Value = unknown, Args extends unknown[] = unknown[]> {
	cache?: SyncCache<Value>;
	keyResolver?: KeyResolver<Args> | keyof This;
	expirationTimeMs?: number;
}

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

function normalizeMemoizeInput<This, Value, Args extends unknown[]>(
	input?: MemoizeConfig<This, Value, Args> | number,
): MemoizeConfig<This, Value, Args> {
	if (typeof input === "number") {
		return {
			expirationTimeMs: input,
		};
	}

	return input ?? {};
}

function scheduleSyncExpiration<Value>(cache: SyncCache<Value>, key: string, expirationTimeMs: number): void {
	setTimeout(() => {
		cache.delete(key);
	}, expirationTimeMs);
}

function createMemoizedMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	input?: MemoizeConfig<This, Return, Args> | number,
): Method<This, Args, Return> {
	const resolvedConfig = normalizeMemoizeInput(input);
	const cachesByInstance = new WeakMap<object, SyncCache<Return>>();
	const fallbackCache: SyncCache<Return> = resolvedConfig.cache ?? new Map<string, Return>();

	const getCache = (instance: This): SyncCache<Return> => {
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

	return function(this: This, ...args: Args): Return {
		const cache = getCache(this);
		const key = resolveCacheKey(this, resolvedConfig.keyResolver, args);

		if (!cache.has(key)) {
			const response = originalMethod.apply(this, args);
			cache.set(key, response);

			if (resolvedConfig.expirationTimeMs !== undefined) {
				scheduleSyncExpiration(cache, key, resolvedConfig.expirationTimeMs);
			}
		}

		return cache.get(key) as Return;
	};
}

export function memoize<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	input?: MemoizeConfig<This, Value, Args> | number,
) {
	return function<Return = Value>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("memoize", value, context);
		return createMemoizedMethod(value, input as MemoizeConfig<This, Return, Args> | number);
	};
}
