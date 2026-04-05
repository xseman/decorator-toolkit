import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import { isWeakMapKey } from "../common/utils.js";

export function createDebouncedMethod<This, Args extends unknown[] = unknown[]>(
	originalMethod: Method<This, Args, unknown>,
	delayMs: number,
): Method<This, Args, void> {
	let handler: ReturnType<typeof setTimeout> | undefined;

	return function(this: This, ...args: Args): void {
		if (handler !== undefined) {
			clearTimeout(handler);
		}

		handler = setTimeout(() => {
			originalMethod.apply(this, args);
		}, delayMs);
	};
}

export function debounce(delayMs: number) {
	return function<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	): Method<This, Args, void> {
		assertMethodDecorator("debounce", value, context);

		const methodsMap = new WeakMap<object, Method<This, Args, void>>();
		const fallbackMethod = createDebouncedMethod(value, delayMs);

		return function(this: This, ...args: Args): void {
			if (!isWeakMapKey(this)) {
				fallbackMethod.apply(this, args);
				return;
			}

			const instanceKey = this as object;

			if (!methodsMap.has(instanceKey)) {
				methodsMap.set(instanceKey, createDebouncedMethod(value, delayMs));
			}

			methodsMap.get(instanceKey)?.apply(this, args);
		};
	};
}
