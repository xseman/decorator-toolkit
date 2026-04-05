import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import { isWeakMapKey } from "../common/utils.js";
import { CanceledPromise } from "./canceled-promise.js";

type CancelPreviousDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

export function createCancelableMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
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

export function cancelPrevious<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function cancelPrevious(): CancelPreviousDecorator;
export function cancelPrevious(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate: CancelPreviousDecorator = function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("cancelPrevious", value, decoratorContext);
		return createCancelableMethod(value);
	};

	if (arguments.length === 2 && isDecoratorCall(context)) {
		return decorate(
			inputOrValue as AsyncMethod<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, AsyncMethod<any, unknown[], unknown>>,
		);
	}

	return decorate;
}
