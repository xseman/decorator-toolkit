import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";

export function createMultiDispatchMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	dispatchesAmount: number,
): AsyncMethod<This, Args, Return> {
	return function(this: This, ...args: Args): Promise<Return> {
		return new Promise<Return>((resolve, reject) => {
			let rejectionsAmount = 0;
			let lastError: unknown;

			for (let index = 0; index < dispatchesAmount; index += 1) {
				Promise.resolve()
					.then(() => {
						return originalMethod.apply(this, args);
					})
					.then(resolve)
					.catch((error) => {
						lastError = error;
						rejectionsAmount += 1;

						if (rejectionsAmount === dispatchesAmount) {
							reject(lastError);
						}
					});
			}
		});
	};
}

export function multiDispatch(dispatchesAmount: number) {
	return function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("multiDispatch", value, context);
		return createMultiDispatchMethod(value, dispatchesAmount);
	};
}
