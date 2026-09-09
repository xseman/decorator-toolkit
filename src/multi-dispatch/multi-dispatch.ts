import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";

export type MultiDispatchDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

/** Hedging: starts `dispatches` identical calls and resolves with the first success. Rejects with `AggregateError`. */
export function multiDispatch(dispatches: number): MultiDispatchDecorator {
	if (!Number.isInteger(dispatches) || dispatches < 1) {
		throw new Error("@multiDispatch: dispatches must be a positive integer.");
	}

	return methodDecorator("multiDispatch", (value) =>
		function(this: unknown, ...args: unknown[]): Promise<unknown> {
			return Promise.any(Array.from({ length: dispatches }, () => Promise.resolve().then(() => value.apply(this, args))));
		});
}
