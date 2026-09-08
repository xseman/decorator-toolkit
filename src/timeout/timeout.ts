import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";

/**
 * Rejects with a `DOMException` named `"TimeoutError"` (the same error `fetch`
 * produces with `AbortSignal.timeout`) when the method does not settle in time.
 */
export function timeout(ms: number) {
	return function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("timeout", value, context);

		return async function(this: This, ...args: Args): Promise<Return> {
			let timer: ReturnType<typeof setTimeout> | undefined;
			const expired = new Promise<never>((_resolve, reject) => {
				timer = setTimeout(() => {
					reject(new DOMException(`Timed out after ${ms} ms`, "TimeoutError"));
				}, ms);
			});

			try {
				return await Promise.race([value.apply(this, args), expired]);
			} finally {
				clearTimeout(timer);
			}
		};
	};
}
