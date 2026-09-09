import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";

export type CancelPreviousDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

/**
 * A new call rejects the still-pending previous call with a `DOMException`
 * named `"AbortError"` (the same error an aborted `fetch` produces).
 */
export function cancelPrevious<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function cancelPrevious(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function cancelPrevious(): CancelPreviousDecorator;
export function cancelPrevious(...args: unknown[]): unknown {
	return overloaded(args, () =>
		methodDecorator<CancelPreviousDecorator>("cancelPrevious", (value) => {
			const slot = perInstance<{ current?: AbortController; }>(() => ({}));

			return function(this: unknown, ...callArgs: unknown[]): Promise<unknown> {
				const state = slot(this);
				state.current?.abort(new DOMException("Superseded by a newer call", "AbortError"));

				const controller = new AbortController();
				state.current = controller;

				return new Promise<unknown>((resolve, reject) => {
					controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
					(value.apply(this, callArgs) as Promise<unknown>).then(resolve, reject).finally(() => {
						if (state.current === controller) {
							state.current = undefined;
						}
					});
				});
			};
		}));
}
