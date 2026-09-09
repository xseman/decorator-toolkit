import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";

export type TimeoutDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

/**
 * Rejects with a `DOMException` named `"TimeoutError"` (the same error `fetch`
 * produces with `AbortSignal.timeout`) when the method does not settle in time.
 */
export function timeout(ms: number): TimeoutDecorator {
	return methodDecorator("timeout", (value) =>
		async function(this: unknown, ...args: unknown[]): Promise<unknown> {
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
		});
}
