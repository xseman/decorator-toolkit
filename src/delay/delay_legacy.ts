import { createDelayedMethod } from "./delay.js";

export function delay(delayMs: number): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@delay is applicable only on methods.");
		}

		descriptor.value = createDelayedMethod(descriptor.value, delayMs);
		return descriptor;
	};
}
