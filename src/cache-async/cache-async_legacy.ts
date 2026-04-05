import type {
	CacheStore,
	KeyResolver,
} from "../cache/cache.js";
import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createCachedAsyncMethod } from "./cache-async.js";
import type {
	AsyncCacheConfig,
	AsyncCacheStore,
} from "./cache-async.js";

export type { AsyncCacheConfig, AsyncCacheStore, CacheStore, KeyResolver };

export function cacheAsync(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function cacheAsync(
	input?: AsyncCacheConfig | number,
): MethodDecorator;
export function cacheAsync(
	targetOrInput?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (desc: PropertyDescriptor, input?: AsyncCacheConfig | number): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@cacheAsync is applicable only on methods.");
		}

		desc.value = createCachedAsyncMethod(desc.value, input);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrInput, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc, targetOrInput as AsyncCacheConfig | number | undefined);
	};
}
