import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";

export function createDelayedMethod<This, Args extends unknown[] = unknown[]>(
	originalMethod: Method<This, Args, unknown>,
	delayMs: number,
): Method<This, Args, void> {
	return function(this: This, ...args: Args): void {
		setTimeout(() => {
			originalMethod.apply(this, args);
		}, delayMs);
	};
}

export function delay(delayMs: number) {
	return function<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	): Method<This, Args, void> {
		assertMethodDecorator("delay", value, context);
		return createDelayedMethod(value, delayMs);
	};
}
