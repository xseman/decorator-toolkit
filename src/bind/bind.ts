import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import type {
	AnyFunction,
	Method,
} from "../common/types.js";

type BindDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => void;

/** Binds the method to its instance (or class, for static methods) at construction. */
export function bind<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): void;
export function bind(): BindDecorator;
export function bind(...args: unknown[]): unknown {
	return overloaded(args, (): BindDecorator => (value, context) => {
		assertMethodDecorator("bind", value, context);

		context.addInitializer(function(this: unknown): void {
			(this as Record<PropertyKey, unknown>)[context.name] = (value as AnyFunction).bind(this);
		});
	});
}
