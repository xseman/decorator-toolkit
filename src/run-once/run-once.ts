import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";
import { isPromise } from "../common/utils.js";

export type RunOnceDecorator = Dual<
	<This, Args extends unknown[], Return>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/**
 * Runs the method once per instance and returns the first result to every later
 * call, ignoring arguments. A throw or rejection resets it so the next call retries.
 */
export function runOnce<This, Args extends unknown[], Return>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function runOnce(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function runOnce(): RunOnceDecorator;
export function runOnce(...args: unknown[]): unknown {
	return overloaded(args, () =>
		methodDecorator<RunOnceDecorator>("runOnce", (value) => {
			const slot = perInstance<{ done: boolean; result?: unknown; }>(() => ({ done: false }));

			return function(this: unknown, ...callArgs: unknown[]): unknown {
				const state = slot(this);
				if (state.done) {
					return state.result;
				}

				state.done = true;
				let result: unknown;
				try {
					result = value.apply(this, callArgs);
				} catch (error) {
					state.done = false;
					throw error;
				}

				if (isPromise(result)) {
					result = result.then(undefined, (error) => {
						state.done = false;
						throw error;
					});
				}

				state.result = result;
				return result;
			};
		}));
}
