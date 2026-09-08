import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	resolveCallable,
	sleep,
} from "../common/utils.js";

/** `attempt` is 1-based: the number of the attempt that just failed. */
export type OnRetry = (error: unknown, attempt: number) => void;

export interface RetryConfig<This = any> {
	retries: number;
	/** Milliseconds, or a function of the failed attempt (1-based) and its error. Default 1000. */
	delay?: number | ((attempt: number, error: unknown) => number);
	/** Return `false` to rethrow immediately. Default: retry every error. */
	shouldRetry?: (error: unknown) => boolean;
	onRetry?: OnRetry | keyof This;
}

export function retry<This = any>(input: number | RetryConfig<This>) {
	const config = typeof input === "number" ? { retries: input } : input;

	if (typeof config !== "object" || config === null || !Number.isInteger(config.retries) || config.retries < 0) {
		throw new Error("@retry: invalid input, expected a retry count or a config object.");
	}

	const { retries, delay = 1000, shouldRetry = () => true } = config;

	return function<Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("retry", value, context);

		return async function(this: This, ...args: Args): Promise<Return> {
			const onRetry = config.onRetry === undefined
				? undefined
				: resolveCallable<This, void>(this, config.onRetry) as OnRetry;

			for (let attempt = 1;; attempt += 1) {
				try {
					return await value.apply(this, args);
				} catch (error) {
					if (attempt > retries || !shouldRetry(error)) {
						throw error;
					}

					onRetry?.(error, attempt);
					await sleep(typeof delay === "function" ? delay(attempt, error) : delay);
				}
			}
		};
	};
}
