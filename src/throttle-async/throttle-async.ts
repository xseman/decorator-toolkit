import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import { isWeakMapKey } from "../common/utils.js";
import { ThrottleAsyncExecutor } from "./throttle-async-executor.js";

type ThrottleAsyncDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

function createThrottledAsyncMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	parallelCalls = 1,
): AsyncMethod<This, Args, Return> {
	const executorsByInstance = new WeakMap<object, ThrottleAsyncExecutor<This, Args, Return>>();
	let fallbackExecutor: ThrottleAsyncExecutor<This, Args, Return> | undefined;

	const getExecutor = (instance: This): ThrottleAsyncExecutor<This, Args, Return> => {
		if (!isWeakMapKey(instance)) {
			fallbackExecutor ??= new ThrottleAsyncExecutor(originalMethod, parallelCalls);
			return fallbackExecutor;
		}

		const instanceKey = instance as object;
		const existingExecutor = executorsByInstance.get(instanceKey);
		if (existingExecutor !== undefined) {
			return existingExecutor;
		}

		const executor = new ThrottleAsyncExecutor(originalMethod, parallelCalls);
		executorsByInstance.set(instanceKey, executor);
		return executor;
	};

	return function(this: This, ...args: Args): Promise<Return> {
		return getExecutor(this).exec(this, args);
	};
}

export function throttleAsync<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function throttleAsync(parallelCalls?: number): ThrottleAsyncDecorator;
export function throttleAsync(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
		parallelCalls = 1,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("throttleAsync", value, decoratorContext);
		return createThrottledAsyncMethod(value, parallelCalls);
	};

	if (isDecoratorCall(context)) {
		return decorate(
			inputOrValue as AsyncMethod<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, AsyncMethod<any, unknown[], unknown>>,
		);
	}

	return <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> => {
		return decorate(value, decoratorContext, inputOrValue as number | undefined);
	};
}
