import { TimeoutError } from "./timeout-error.js";
import { createTimedMethod } from "./timeout.js";

export { TimeoutError };

export function timeout(ms: number): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@timeout is applicable only on methods.");
		}

		descriptor.value = createTimedMethod(descriptor.value, ms);
		return descriptor;
	};
}
