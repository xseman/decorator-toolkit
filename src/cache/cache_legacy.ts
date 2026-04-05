import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createCachedMethod } from "./cache.js";
import type {
	CacheConfig,
	CacheStore,
	KeyResolver,
} from "./cache.js";

export type { CacheConfig, CacheStore, KeyResolver };

export function cache(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function cache(
	input?: CacheConfig | number,
): MethodDecorator;
export function cache(
	targetOrInput?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (desc: PropertyDescriptor, input?: CacheConfig | number): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@cache is applicable only on methods.");
		}

		desc.value = createCachedMethod(desc.value, input);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrInput, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc, targetOrInput as CacheConfig | number | undefined);
	};
}
