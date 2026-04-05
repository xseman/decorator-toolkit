import {
	createRateLimitedMethod,
	SimpleRateLimitCounter,
} from "./rate-limit.js";
import type {
	RateLimitAsyncCounter,
	RateLimitConfig,
	RateLimitCounter,
} from "./rate-limit.js";

export type { RateLimitAsyncCounter, RateLimitConfig, RateLimitCounter };
export { SimpleRateLimitCounter };

export function rateLimit<This = any, Args extends unknown[] = unknown[]>(
	config: RateLimitConfig<This, Args>,
): MethodDecorator {
	if (config.rateLimitAsyncCounter !== undefined && config.rateLimitCounter !== undefined) {
		throw new Error("You cant provide both rateLimitAsyncCounter and rateLimitCounter.");
	}

	const resolvedConfig = {
		rateLimitCounter: new SimpleRateLimitCounter(),
		exceedHandler: (): void => {
			throw new Error("You have acceded the amount of allowed calls");
		},
		...config,
	};

	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@rateLimit is applicable only on methods.");
		}

		descriptor.value = createRateLimitedMethod(descriptor.value, resolvedConfig as any);
		return descriptor;
	};
}
