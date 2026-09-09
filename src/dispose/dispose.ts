import {
	assertMethodDecorator,
	type Dual,
	dual,
	overloaded,
} from "../common/decorators.js";
import { addDisposer } from "../common/dispose.js";
import type { Method } from "../common/types.js";

export interface DisposeConfig {
	/** Wire to `Symbol.asyncDispose` (for `await using`) instead of `Symbol.dispose`. */
	async?: boolean;
}

export type DisposeDecorator = Dual<(value: Method<any>, context: ClassMethodDecoratorContext) => void>;

/**
 * Wires the method to `Symbol.dispose` so `using` calls it. Multiple disposers run
 * in declaration order. Legacy decorators wire the prototype instead of each instance.
 */
export function dispose(value: Method<any>, context: ClassMethodDecoratorContext): void;
export function dispose(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function dispose(config?: DisposeConfig): DisposeDecorator;
export function dispose(...args: unknown[]): unknown {
	return overloaded(args, (config: DisposeConfig = {}) =>
		dual<DisposeDecorator>(
			(value, context: ClassMethodDecoratorContext) => {
				assertMethodDecorator("dispose", value, context);

				context.addInitializer(function(this: unknown): void {
					addDisposer(this as object, value, config.async);
				});
			},
			(target, _key, descriptor) => {
				if (typeof descriptor.value !== "function") {
					throw new Error("@dispose is applicable only on methods.");
				}

				addDisposer(target, descriptor.value, config.async);
				return descriptor;
			},
		));
}
