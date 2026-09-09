import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";

export type DebounceDecorator = Dual<
	<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	) => Method<This, Args, void>
>;

/** Runs the method once `delayMs` after the last call. The return value is dropped. */
export function debounce(delayMs: number): DebounceDecorator {
	return methodDecorator("debounce", (value) => {
		const slot = perInstance<{ timer?: ReturnType<typeof setTimeout>; }>(() => ({}));

		return function(this: unknown, ...args: unknown[]): void {
			const state = slot(this);
			clearTimeout(state.timer);
			state.timer = setTimeout(() => value.apply(this, args), delayMs);
		};
	});
}
