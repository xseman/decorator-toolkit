import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";

export type ThrottleDecorator = Dual<
	<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	) => Method<This, Args, void>
>;

/** Runs the method at most once per `delayMs`; calls in between are dropped, as is the return value. */
export function throttle(delayMs: number): ThrottleDecorator {
	return methodDecorator("throttle", (value) => {
		const slot = perInstance(() => ({ throttled: false }));

		return function(this: unknown, ...args: unknown[]): void {
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
	});
}
