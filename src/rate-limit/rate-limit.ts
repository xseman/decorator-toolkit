import type { Method } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

export interface RateLimitCounter {
	inc: (key: string) => void;
	dec: (key: string) => void;
	getCount: (key: string) => number;
}

export interface RateLimitAsyncCounter {
	inc: (key: string) => Promise<void>;
	dec: (key: string) => Promise<void>;
	getCount: (key: string) => Promise<number>;
}

export interface RateLimitConfig<This = any, Args extends unknown[] = unknown[]> {
	timeSpanMs: number;
	allowedCalls: number;
	keyResolver?: ((...args: Args) => string) | keyof This;
	rateLimitCounter?: RateLimitCounter;
	rateLimitAsyncCounter?: RateLimitAsyncCounter;
	exceedHandler?: () => void;
}

export class SimpleRateLimitCounter implements RateLimitCounter {
	constructor(private readonly counterMap = new Map<string, number>()) {
	}

	getCount(key: string): number {
		return this.counterMap.get(key) ?? 0;
	}

	inc(key: string): void {
		this.counterMap.set(key, this.getCount(key) + 1);
	}

	dec(key: string): void {
		const currentCount = this.counterMap.get(key) ?? 0;

		if (currentCount <= 1) {
			this.counterMap.delete(key);
			return;
		}

		this.counterMap.set(key, currentCount - 1);
	}
}

function assertRateLimitDecorator(value: unknown, context: { kind: string; private?: boolean; }): asserts value is Method<any, any, any> {
	if (context.kind !== "method" || typeof value !== "function" || context.private) {
		throw new Error("@rateLimit is applicable only on a method.");
	}
}

async function handleAsyncRateLimit<This, Args extends unknown[], Return>(
	target: This,
	resolvedConfig: Required<Pick<RateLimitConfig<This, Args>, "allowedCalls" | "timeSpanMs" | "exceedHandler">> & RateLimitConfig<This, Args>,
	key: string,
	originalMethod: Method<This, Args, Return>,
	args: Args,
): Promise<Awaited<Return>> {
	const rateLimitCounter = resolvedConfig.rateLimitAsyncCounter as RateLimitAsyncCounter;
	const currentCount = await rateLimitCounter.getCount(key);

	if (currentCount >= resolvedConfig.allowedCalls) {
		resolvedConfig.exceedHandler();
	}

	await rateLimitCounter.inc(key);
	setTimeout(() => {
		void rateLimitCounter.dec(key);
	}, resolvedConfig.timeSpanMs);

	return await originalMethod.apply(target, args) as Awaited<Return>;
}

function handleRateLimit<This, Args extends unknown[], Return>(
	target: This,
	resolvedConfig: Required<Pick<RateLimitConfig<This, Args>, "allowedCalls" | "timeSpanMs" | "exceedHandler">> & RateLimitConfig<This, Args>,
	key: string,
	originalMethod: Method<This, Args, Return>,
	args: Args,
): Return {
	const rateLimitCounter = resolvedConfig.rateLimitCounter as RateLimitCounter;
	const currentCount = rateLimitCounter.getCount(key);

	if (currentCount >= resolvedConfig.allowedCalls) {
		resolvedConfig.exceedHandler();
	}

	rateLimitCounter.inc(key);
	setTimeout(() => {
		rateLimitCounter.dec(key);
	}, resolvedConfig.timeSpanMs);

	return originalMethod.apply(target, args);
}

export function createRateLimitedMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	resolvedConfig: Required<Pick<RateLimitConfig<This, Args>, "allowedCalls" | "timeSpanMs" | "exceedHandler">> & RateLimitConfig<This, Args>,
): Method<This, Args, Return> {
	return function(this: This, ...args: Args): Return {
		const key = resolvedConfig.keyResolver === undefined
			? "__rateLimit__"
			: resolveCallable<This, string>(this, resolvedConfig.keyResolver)(...args);

		if (resolvedConfig.rateLimitAsyncCounter !== undefined) {
			return handleAsyncRateLimit(this, resolvedConfig, key, originalMethod, args) as Return;
		}

		return handleRateLimit(this, resolvedConfig, key, originalMethod, args);
	};
}

export function rateLimit<This = any, Args extends unknown[] = unknown[]>(config: RateLimitConfig<This, Args>) {
	if (config.rateLimitAsyncCounter !== undefined && config.rateLimitCounter !== undefined) {
		throw new Error("You cant provide both rateLimitAsyncCounter and rateLimitCounter.");
	}

	const resolvedConfig: Required<Pick<RateLimitConfig<This, Args>, "allowedCalls" | "timeSpanMs" | "exceedHandler">> & RateLimitConfig<This, Args> = {
		rateLimitCounter: new SimpleRateLimitCounter(),
		exceedHandler: () => {
			throw new Error("You have acceded the amount of allowed calls");
		},
		...config,
	};

	return function<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertRateLimitDecorator(value, context);
		return createRateLimitedMethod(value, resolvedConfig);
	};
}
