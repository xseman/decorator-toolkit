import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import { addDisposer } from "../common/dispose.js";
import type { Method } from "../common/types.js";

export interface DisposeConfig {
	/** Wire to `Symbol.asyncDispose` (for `await using`) instead of `Symbol.dispose`. */
	async?: boolean;
}

type DisposeDecorator = (value: Method<any>, context: ClassMethodDecoratorContext) => void;

/** Wires the method to `Symbol.dispose` so `using` calls it. Multiple disposers run in declaration order. */
export function dispose(value: Method<any>, context: ClassMethodDecoratorContext): void;
export function dispose(config?: DisposeConfig): DisposeDecorator;
export function dispose(...args: unknown[]): unknown {
	return overloaded(args, (config: DisposeConfig = {}): DisposeDecorator => (value, context) => {
		assertMethodDecorator("dispose", value, context);

		context.addInitializer(function(this: unknown): void {
			addDisposer(this as object, value, config.async);
		});
	});
}
