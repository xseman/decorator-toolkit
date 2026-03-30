import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";

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

export function delegate<This = any, Args extends unknown[] = unknown[]>(
	keyResolver?: ((...args: Args) => string) | keyof This,
) {
	return function<Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("delegate", value, context);
		return createDelegatedMethod(value, keyResolver);
	};
}
