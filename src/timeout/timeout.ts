import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import { TimeoutError } from "./timeout-error.js";

export function createTimedMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	ms: number,
): AsyncMethod<This, Args, Return> {
	return async function(this: This, ...args: Args): Promise<Return> {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		try {
			return await Promise.race([
				originalMethod.apply(this, args),
				new Promise<never>((_resolve, reject) => {
					timeoutId = setTimeout(() => {
						reject(new TimeoutError(ms));
					}, ms);
				}),
			]);
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}
	};
}

export function timeout(ms: number) {
	return function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("timeout", value, context);
		return createTimedMethod(value, ms);
	};
}
