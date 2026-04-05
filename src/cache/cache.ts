import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";

export type KeyResolver<Args extends unknown[] = unknown[]> = (...args: Args) => string;

export interface CacheStore<Value> {
	set: (key: string, value: Value) => unknown;
	get: (key: string) => Value | null | undefined;
	delete: (key: string) => unknown;
	has: (key: string) => boolean;
}

export interface CacheConfig<This = any, Value = unknown, Args extends unknown[] = unknown[]> {
	store?: CacheStore<Value>;
	keyResolver?: KeyResolver<Args> | keyof This;
	ttlMs?: number;
}

type CacheDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => Method<This, Args, Return>;

export function resolveCacheKey<This, Args extends unknown[]>(
	instance: This,
	keyResolver: KeyResolver<Args> | keyof This | undefined,
	args: Args,
): string {
	if (keyResolver === undefined) {
		return JSON.stringify(args);
	}

	return resolveCallable<This, string>(instance, keyResolver)(...args);
}

export function normalizeCacheInput<This, Value, Args extends unknown[]>(
	input?: CacheConfig<This, Value, Args> | number,
): CacheConfig<This, Value, Args> {
	if (typeof input === "number") {
		return {
			ttlMs: input,
		};
	}

	return input ?? {};
}

export function scheduleCacheExpiration<Value>(store: CacheStore<Value>, key: string, ttlMs: number): void {
	setTimeout(() => {
		store.delete(key);
	}, ttlMs);
}

export function createCachedMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	input?: CacheConfig<This, Return, Args> | number,
): Method<This, Args, Return> {
	const resolvedConfig = normalizeCacheInput(input);
	const storesByInstance = new WeakMap<object, CacheStore<Return>>();
	const fallbackStore: CacheStore<Return> = resolvedConfig.store ?? new Map<string, Return>();

	const getStore = (instance: This): CacheStore<Return> => {
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

	return function(this: This, ...args: Args): Return {
		const store = getStore(this);
		const key = resolveCacheKey(this, resolvedConfig.keyResolver, args);

		if (!store.has(key)) {
			const response = originalMethod.apply(this, args);
			store.set(key, response);

			if (resolvedConfig.ttlMs !== undefined) {
				scheduleCacheExpiration(store, key, resolvedConfig.ttlMs);
			}
		}

		return store.get(key) as Return;
	};
}

export function cache<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	value: Method<This, Args, Value>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Value>>,
): Method<This, Args, Value>;
export function cache<This = any, Value = unknown, Args extends unknown[] = unknown[]>(
	input?: CacheConfig<This, Value, Args> | number,
): CacheDecorator;
export function cache(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
		input?: CacheConfig<This, Return, Args> | number,
	): Method<This, Args, Return> => {
		assertMethodDecorator("cache", value, decoratorContext);
		return createCachedMethod(value, input as CacheConfig<This, Return, Args> | number);
	};

	if (isDecoratorCall(context)) {
		return decorate(
			inputOrValue as Method<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, Method<any, unknown[], unknown>>,
		);
	}

	return <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> => {
		return decorate(value, decoratorContext, inputOrValue as CacheConfig<This, Return, Args> | number | undefined);
	};
}
