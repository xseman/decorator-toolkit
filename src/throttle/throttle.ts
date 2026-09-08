import { assertMethodDecorator } from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";

/** Runs the method at most once per `delayMs`; calls in between are dropped, as is the return value. */
export function throttle(delayMs: number) {
	return function<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	): Method<This, Args, void> {
		assertMethodDecorator("throttle", value, context);

		const slot = perInstance(() => ({ throttled: false }));

		return function(this: This, ...args: Args): void {
			const state = slot(this);
			if (state.throttled) {
				return;
			}

			state.throttled = true;
			setTimeout(() => {
				state.throttled = false;
			}, delayMs);
			value.apply(this, args);
		};
	};
}
