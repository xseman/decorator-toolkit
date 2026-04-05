import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import { isWeakMapKey } from "../common/utils.js";

export function createThrottledMethod<This, Args extends unknown[] = unknown[]>(
	originalMethod: Method<This, Args, unknown>,
	delayMs: number,
): Method<This, Args, void> {
	let throttling = false;

	return function(this: This, ...args: Args): void {
		if (!throttling) {
			throttling = true;
			originalMethod.apply(this, args);

			setTimeout(() => {
				throttling = false;
			}, delayMs);
		}
	};
}

export function throttle(delayMs: number) {
	return function<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	): Method<This, Args, void> {
		assertMethodDecorator("throttle", value, context);

		const methodsMap = new WeakMap<object, Method<This, Args, void>>();
		const fallbackMethod = createThrottledMethod(value, delayMs);

		return function(this: This, ...args: Args): void {
			if (!isWeakMapKey(this)) {
				fallbackMethod.apply(this, args);
				return;
			}

			const instanceKey = this as object;

			if (!methodsMap.has(instanceKey)) {
				methodsMap.set(instanceKey, createThrottledMethod(value, delayMs));
			}

			methodsMap.get(instanceKey)?.apply(this, args);
		};
	};
}
