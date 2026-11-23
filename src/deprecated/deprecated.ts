import {
	type Dual,
	methodDecorator,
	overloaded,
	propertyName,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";

export type DeprecatedDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

/** Warns once via `console.warn` (per decorated method, not per instance) that the method is deprecated, then calls it. */
export function deprecated<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): Method<This, Args, Return>;
export function deprecated(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function deprecated(message?: string): DeprecatedDecorator;
export function deprecated(...args: unknown[]): unknown {
	return overloaded(args, (message?: string) =>
		methodDecorator<DeprecatedDecorator>("deprecated", (value, context) => {
			const notice = `${propertyName(context.name)}() is deprecated.`;
			let warned = false;

			return function(this: unknown, ...callArgs: unknown[]): unknown {
				if (!warned) {
					warned = true;
					console.warn(message === undefined ? notice : `${notice} ${message}`);
				}

				return value.apply(this, callArgs);
			};
		}));
}
