import { assertMethodDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";

/** Hedging: starts `dispatches` identical calls and resolves with the first success. Rejects with `AggregateError`. */
export function multiDispatch(dispatches: number) {
	if (!Number.isInteger(dispatches) || dispatches < 1) {
		throw new Error("@multiDispatch: dispatches must be a positive integer.");
	}

	return function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> {
		assertMethodDecorator("multiDispatch", value, context);

		return function(this: This, ...args: Args): Promise<Return> {
			return Promise.any(Array.from({ length: dispatches }, () => Promise.resolve().then(() => value.apply(this, args))));
		};
	};
}
