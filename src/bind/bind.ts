import {
	assertMethodDecorator,
	type Dual,
	dual,
	overloaded,
} from "../common/decorators.js";
import type {
	AnyFunction,
	Method,
} from "../common/types.js";

export type BindDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => void
>;

/**
 * Binds the method to its instance (or class, for static methods). Standard
 * decorators bind at construction; legacy decorators bind on first access.
 */
export function bind<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): void;
export function bind(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function bind(): BindDecorator;
export function bind(...args: unknown[]): unknown {
	return overloaded(args, () =>
		dual<BindDecorator>(
			(value, context: ClassMethodDecoratorContext) => {
				assertMethodDecorator("bind", value, context);

				context.addInitializer(function(this: unknown): void {
					// looked up on the instance so decorators stacked above `@bind` stay in the call path
					const self = this as Record<PropertyKey, AnyFunction>;
					self[context.name] = self[context.name]!.bind(this);
				});
			},
			(_target, key, descriptor) => {
				if (typeof descriptor.value !== "function") {
					throw new Error("@bind is applicable only on methods.");
				}

				const method = descriptor.value as AnyFunction;
				return {
					configurable: true,
					enumerable: descriptor.enumerable,
					get(this: object): AnyFunction {
						const bound = method.bind(this);
						Object.defineProperty(this, key, { value: bound, configurable: true, writable: true, enumerable: descriptor.enumerable });
						return bound;
					},
				};
			},
		));
}
