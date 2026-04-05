import { createOnErrorMethod } from "./on-error.js";
import type {
	OnErrorConfig,
	OnErrorHandler,
} from "./on-error.js";

export type { OnErrorConfig, OnErrorHandler };

export function onError<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	config: OnErrorConfig<This, Return, Args>,
): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@onError is applicable only on methods.");
		}

		descriptor.value = createOnErrorMethod(descriptor.value, config);
		return descriptor;
	};
}
