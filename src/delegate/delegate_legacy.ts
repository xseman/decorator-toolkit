import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createDelegatedMethod } from "./delegate.js";

export function delegate(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function delegate<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
): MethodDecorator;
export function delegate(
	targetOrKeyResolver?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (
		desc: PropertyDescriptor,
		keyResolver?: ((...args: unknown[]) => string) | PropertyKey,
	): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@delegate is applicable only on methods.");
		}

		desc.value = createDelegatedMethod(desc.value, keyResolver as any);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrKeyResolver, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc, targetOrKeyResolver as ((...args: unknown[]) => string) | PropertyKey | undefined);
	};
}
