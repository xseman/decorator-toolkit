import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface RateLimitConfig<This = any, Args extends unknown[] = unknown[]> {
	allowedCalls: number;
	timeSpanMs: number;
	/** Limits per resolved key instead of per instance. */
	keyResolver?: ((...args: Args) => string) | keyof This;
}

export type RateLimitDecorator<This = any, Args extends unknown[] = unknown[]> = Dual<
	<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/** Sliding-window limit per instance (and per key when `keyResolver` is set). Throws when exceeded. */
export function rateLimit<This = any, Args extends unknown[] = unknown[]>(
	config: RateLimitConfig<This, Args>,
): RateLimitDecorator<This, Args> {
	return methodDecorator("rateLimit", (value) => {
		// ponytail: keys never seen again keep their last window; sweep if key cardinality is unbounded
		const slot = perInstance(() => ({ async: false, windows: new Map<string, number[]>() }));

		return function(this: This, ...args: unknown[]): unknown {
			const key = config.keyResolver === undefined
				? ""
				: resolveCallable<This, string>(this, config.keyResolver)(...args);
			const state = slot(this);
			const now = performance.now();
			const hits = (state.windows.get(key) ?? []).filter((at) => at > now - config.timeSpanMs);

			if (hits.length >= config.allowedCalls) {
				const error = new Error(`Rate limit exceeded: ${config.allowedCalls} calls per ${config.timeSpanMs} ms`);
				if (state.async) {
					return Promise.reject(error);
				}
				throw error;
			}

			hits.push(now);
			state.windows.set(key, hits);
			const result = value.apply(this, args);
			state.async = isPromise(result);
			return result;
		};
	});
}
