import { createAfterMethod } from "./after.js";
import type {
	AfterConfig,
	AfterFunc,
	AfterParams,
} from "./after.js";

export type { AfterConfig, AfterFunc, AfterParams };

export function after<This = any, Response = unknown, Args extends unknown[] = unknown[]>(
	config: AfterConfig<This, Response, Args>,
): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@after is applicable only on methods.");
		}

		descriptor.value = createAfterMethod(descriptor.value, config);
		return descriptor;
	};
}
