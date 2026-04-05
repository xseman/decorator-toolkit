import {
	createRetryMethod,
	getRetriesArray,
} from "./retry.js";
import type {
	OnRetry,
	RetryInput,
	RetryInputConfig,
} from "./retry.js";

export type { OnRetry, RetryInput, RetryInputConfig };

export function retry<This = any>(input: RetryInput<This>): MethodDecorator {
	const retriesArray = getRetriesArray(input);

	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@retry is applicable only on methods.");
		}

		descriptor.value = createRetryMethod(descriptor.value, retriesArray, input);
		return descriptor;
	};
}
