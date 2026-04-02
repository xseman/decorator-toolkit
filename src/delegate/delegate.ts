import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";

type DelegateDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

function createDelegatedMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: AsyncMethod<This, Args, Return>,
	keyResolver?: ((...args: Args) => string) | keyof This,
): AsyncMethod<This, Args, Return> {
	const delegatedByInstance = new WeakMap<object, Map<string, Promise<Return>>>();
	const fallbackDelegated = new Map<string, Promise<Return>>();

	const getPendingMap = (instance: This): Map<string, Promise<Return>> => {
		if (!isWeakMapKey(instance)) {
			return fallbackDelegated;
		}

		const instanceKey = instance as object;
		const existingMap = delegatedByInstance.get(instanceKey);
		if (existingMap !== undefined) {
			return existingMap;
		}

		const pendingMap = new Map<string, Promise<Return>>();
		delegatedByInstance.set(instanceKey, pendingMap);
		return pendingMap;
	};

	return function(this: This, ...args: Args): Promise<Return> {
		const key = keyResolver === undefined
			? JSON.stringify(args)
			: resolveCallable<This, string>(this, keyResolver)(...args);
		const pendingMap = getPendingMap(this);

		if (!pendingMap.has(key)) {
			pendingMap.set(
				key,
				originalMethod.apply(this, args).finally(() => {
					pendingMap.delete(key);
				}),
			);
		}

		return pendingMap.get(key) as Promise<Return>;
	};
}

export function delegate<This = any, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function delegate<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
): DelegateDecorator;
export function delegate(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate = <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
		keyResolver?: ((...args: Args) => string) | keyof This,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("delegate", value, decoratorContext);
		return createDelegatedMethod(value, keyResolver);
	};

	if (arguments.length === 2 && isDecoratorCall(context)) {
		return decorate(
			inputOrValue as AsyncMethod<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, AsyncMethod<any, unknown[], unknown>>,
		);
	}

	const keyResolver = inputOrValue as ((...args: unknown[]) => string) | PropertyKey | undefined;
	return <This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> => {
		return decorate(value, decoratorContext, keyResolver as ((...args: Args) => string) | keyof This | undefined);
	};
}
