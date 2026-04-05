import { createBeforeMethod } from "./before.js";
import type { BeforeConfig } from "./before.js";

export type { BeforeConfig };

export function before<This = any>(config: BeforeConfig<This>): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@before is applicable only on methods.");
		}

		descriptor.value = createBeforeMethod(descriptor.value, config);
		return descriptor;
	};
}
