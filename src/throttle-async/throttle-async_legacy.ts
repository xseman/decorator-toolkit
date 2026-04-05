import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createThrottledAsyncMethod } from "./throttle-async.js";

export function throttleAsync(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function throttleAsync(parallelCalls?: number): MethodDecorator;
export function throttleAsync(
	targetOrParallelCalls?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (desc: PropertyDescriptor, parallelCalls?: number): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@throttleAsync is applicable only on methods.");
		}

		desc.value = createThrottledAsyncMethod(desc.value, parallelCalls);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrParallelCalls, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc, targetOrParallelCalls as number | undefined);
	};
}
