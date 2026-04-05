import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createCancelableMethod } from "./cancel-previous.js";
import { CanceledPromise } from "./canceled-promise.js";

export { CanceledPromise };

export function cancelPrevious(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function cancelPrevious(): MethodDecorator;
export function cancelPrevious(
	targetOrEmpty?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (desc: PropertyDescriptor): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@cancelPrevious is applicable only on methods.");
		}

		desc.value = createCancelableMethod(desc.value);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrEmpty, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc);
	};
}
