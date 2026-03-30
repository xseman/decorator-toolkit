import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	resolveCallable,
	sleep,
} from "../common/utils.js";

const DEFAULT_DELAY = 1000;

export type OnRetry = (error: any, retriesCount: number) => void;

export type RetryInput<This = any> = number | number[] | RetryInputConfig<This>;

export type RetryInputConfig<This = any> = {
	delaysArray?: number[];
	retries?: number;
	delay?: number;
	onRetry?: OnRetry | keyof This;
};

function getRetriesArray(input: RetryInput<any>): number[] {
	if (Array.isArray(input)) {
		return input;
	}

	if (typeof input === "number" && Number.isInteger(input)) {
		return Array.from({ length: input }, () => {
			return DEFAULT_DELAY;
		});
	}

	if (typeof input === "object" && input !== null) {
		const { retries, delaysArray, delay } = input;

		if (retries !== undefined && delaysArray !== undefined) {
			throw new Error("You can not provide both retries and delaysArray");
		}

		if (delaysArray !== undefined) {
			return delaysArray;
		}

		return Array.from({ length: retries ?? 0 }, () => {
			return delay ?? DEFAULT_DELAY;
		});
	}

	throw new Error("invalid input");
}

function getOnRetry<This>(input: RetryInput<This>, context: This): OnRetry | undefined {
	if (typeof input === "object" && !Array.isArray(input) && input !== null) {
		const { onRetry } = input;
		if (onRetry !== undefined) {
			return resolveCallable<This, unknown>(context, onRetry) as OnRetry;
		}
	}

	return undefined;
}

async function execRetry<This, Args extends unknown[], Return>(
	thisArg: This,
	originalMethod: AsyncMethod<This, Args, Return>,
	args: Args,
	retriesArray: number[],
	callsMadeSoFar: number,
	onRetry?: OnRetry,
): Promise<Return> {
	try {
		return await originalMethod.apply(thisArg, args);
	} catch (error) {
		if (callsMadeSoFar < retriesArray.length) {
			onRetry?.(error, callsMadeSoFar);
			await sleep(retriesArray[callsMadeSoFar] ?? DEFAULT_DELAY);
			return execRetry(thisArg, originalMethod, args, retriesArray, callsMadeSoFar + 1, onRetry);
		}

		throw error;
	}
}

function createRetryMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	retriesArray: number[],
	input: RetryInput<This>,
): AsyncMethod<This, Args, Return> {
	return function(this: This, ...args: Args): Promise<Return> {
		const onRetry = getOnRetry(input, this);
		return execRetry(this, originalMethod, args, retriesArray, 0, onRetry);
	};
}

export function retry<This = any>(input: RetryInput<This>) {
	const retriesArray = getRetriesArray(input);

	return function<Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("retry", value, context);
		return createRetryMethod(value, retriesArray, input);
	};
}
