import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";

export type DelayDecorator = Dual<
	<This, Args extends unknown[] = unknown[]>(
		value: Method<This, Args, unknown>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, unknown>>,
	) => Method<This, Args, void>
>;

/** Fire-and-forget: runs the method `delayMs` later. The return value is dropped. */
export function delay(delayMs: number): DelayDecorator {
	return methodDecorator("delay", (value) =>
		function(this: unknown, ...args: unknown[]): void {
			setTimeout(() => value.apply(this, args), delayMs);
		});
}
