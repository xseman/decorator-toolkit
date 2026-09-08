import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";
import { isPromise } from "../common/utils.js";

type RunOnceDecorator = <This, Args extends unknown[], Return>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => Method<This, Args, Return>;

/**
 * Runs the method once per instance and returns the first result to every later
 * call, ignoring arguments. A throw or rejection resets it so the next call retries.
 */
export function runOnce<This, Args extends unknown[], Return>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function runOnce(): RunOnceDecorator;
export function runOnce(...args: unknown[]): unknown {
	return overloaded(args, (): RunOnceDecorator => (value, context) => {
		assertMethodDecorator("runOnce", value, context);
		type This = ThisParameterType<typeof value>;
		type Return = ReturnType<typeof value>;

		const slot = perInstance<{ done: boolean; result?: Return; }>(() => ({ done: false }));

		return function(this: This, ...callArgs: Parameters<typeof value>): Return {
			const state = slot(this);
			if (state.done) {
				return state.result as Return;
			}

			state.done = true;
			let result: Return;
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
				}) as Return;
			}

			state.result = result;
			return result;
		};
	});
}
