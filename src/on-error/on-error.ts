import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface OnErrorConfig<This = any, Return = unknown, Args extends unknown[] = unknown[]> {
	func: OnErrorHandler<Return, Args> | keyof This;
}

export type OnErrorHandler<Return = unknown, Args extends unknown[] = unknown[]> = (error: any, args: Args) => Return | Promise<Awaited<Return>>;

export function createOnErrorMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	config: OnErrorConfig<This, Return, Args>,
): Method<This, Args, Return> {
	return function(this: This, ...args: Args): Return {
		const onErrorFunc = resolveCallable<This, Return | Promise<Awaited<Return>>>(this, config.func);

		try {
			const result = originalMethod.apply(this, args);
			if (isPromise(result)) {
				return result.catch((error) => {
					return onErrorFunc(error, args);
				}) as Return;
			}

			return result;
		} catch (error) {
			return onErrorFunc(error, args) as Return;
		}
	};
}

export function onError<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	config: OnErrorConfig<This, Return, Args>,
) {
	return function(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("onError", value, context);
		return createOnErrorMethod(value, config);
	};
}
