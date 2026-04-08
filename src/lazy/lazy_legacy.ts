import {
	assertLegacyGetterDecorator,
	isLegacyDecoratorCall,
} from "../common/decorators_legacy.js";
import { isWeakMapKey } from "../common/utils.js";

function makeLazyDescriptor(descriptor: PropertyDescriptor): PropertyDescriptor {
	assertLegacyGetterDecorator("lazy", descriptor);

	const originalGet = descriptor.get as (this: unknown) => unknown;
	const cache = new WeakMap<object, unknown>();

	return {
		...descriptor,
		get(this: unknown): unknown {
			if (isWeakMapKey(this) && cache.has(this as object)) {
				return cache.get(this as object);
			}

			const result = originalGet.call(this);

			if (isWeakMapKey(this)) {
				cache.set(this as object, result);
			}

			return result;
		},
	};
}

export function lazy(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function lazy(): MethodDecorator;
export function lazy(
	targetOrEmpty?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	if (isLegacyDecoratorCall(targetOrEmpty, key, descriptor)) {
		return makeLazyDescriptor(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return makeLazyDescriptor(desc);
	};
}
