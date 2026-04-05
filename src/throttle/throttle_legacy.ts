import { isWeakMapKey } from "../common/utils.js";
import { createThrottledMethod } from "./throttle.js";

export function throttle(delayMs: number): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@throttle is applicable only on methods.");
		}

		const original = descriptor.value as (...args: unknown[]) => unknown;
		const methodsMap = new WeakMap<object, (...args: unknown[]) => void>();
		const fallbackMethod = createThrottledMethod(original, delayMs);

		descriptor.value = function(this: unknown, ...args: unknown[]): void {
			if (!isWeakMapKey(this)) {
				fallbackMethod.apply(this, args);
				return;
			}

			const instanceKey = this as object;
			if (!methodsMap.has(instanceKey)) {
				methodsMap.set(instanceKey, createThrottledMethod(original, delayMs));
			}

			methodsMap.get(instanceKey)!.apply(this, args);
		};

		return descriptor;
	};
}
