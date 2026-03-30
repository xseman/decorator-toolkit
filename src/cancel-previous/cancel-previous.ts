import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import { isWeakMapKey } from "../common/utils.js";
import { CanceledPromise } from "./canceled-promise.js";

function createCancelableMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
): AsyncMethod<This, Args, Return> {
	const rejectors = new WeakMap<object, (error: CanceledPromise) => void>();
	let fallbackRejector: ((error: CanceledPromise) => void) | undefined;

	return function(this: This, ...args: Args): Promise<Return> {
		const getRejector = (): ((error: CanceledPromise) => void) | undefined => {
			if (isWeakMapKey(this)) {
				return rejectors.get(this as object);
			}

			return fallbackRejector;
		};

		const setRejector = (rejector?: (error: CanceledPromise) => void): void => {
			if (isWeakMapKey(this)) {
				if (rejector === undefined) {
					rejectors.delete(this as object);
					return;
				}

				rejectors.set(this as object, rejector);
				return;
			}

			fallbackRejector = rejector;
		};

		getRejector()?.(new CanceledPromise());

		return new Promise<Return>((resolve, reject) => {
			const currentReject = (error: CanceledPromise): void => {
				reject(error);
			};

			setRejector(currentReject);

			originalMethod.apply(this, args).then(resolve, reject).finally(() => {
				if (getRejector() === currentReject) {
					setRejector(undefined);
				}
			});
		});
	};
}

export function cancelPrevious() {
	return function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("cancelPrevious", value, context);
		return createCancelableMethod(value);
	};
}
