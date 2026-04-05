import { isWeakMapKey } from "../common/utils.js";
import { createDebouncedMethod } from "./debounce.js";

export function debounce(delayMs: number): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@debounce is applicable only on methods.");
		}

		const original = descriptor.value as (...args: unknown[]) => unknown;
		const methodsMap = new WeakMap<object, (...args: unknown[]) => void>();
		const fallbackMethod = createDebouncedMethod(original, delayMs);

		descriptor.value = function(this: unknown, ...args: unknown[]): void {
			if (!isWeakMapKey(this)) {
				fallbackMethod.apply(this, args);
				return;
			}

			const instanceKey = this as object;
			if (!methodsMap.has(instanceKey)) {
				methodsMap.set(instanceKey, createDebouncedMethod(original, delayMs));
			}

			methodsMap.get(instanceKey)!.apply(this, args);
		};

		return descriptor;
	};
}
