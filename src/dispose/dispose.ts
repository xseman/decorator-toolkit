import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";

export interface DisposeConfig {
	async?: boolean;
}

type DisposeDecorator = (
	value: Method<any>,
	context: ClassMethodDecoratorContext,
) => void;

function wire(
	value: Method<any>,
	decoratorContext: ClassMethodDecoratorContext,
	config: DisposeConfig,
): void {
	assertMethodDecorator("dispose", value, decoratorContext);

	const symbol = config.async ? Symbol.asyncDispose : Symbol.dispose;

	if (typeof symbol !== "symbol") {
		throw new Error(
			`@dispose requires ${config.async ? "Symbol.asyncDispose" : "Symbol.dispose"}, which is not available in this runtime.`,
		);
	}

	decoratorContext.addInitializer(function(this: any): void {
		const instance = this as Record<PropertyKey, unknown>;
		const previous = instance[symbol];

		if (config.async) {
			instance[symbol] = async function(this: unknown): Promise<void> {
				if (typeof previous === "function") {
					await (previous as () => unknown).call(this);
				}
				await value.call(this);
			};
		} else {
			instance[symbol] = function(this: unknown): void {
				if (typeof previous === "function") {
					(previous as () => void).call(this);
				}
				(value as () => void).call(this);
			};
		}
	});
}

export function dispose(
	value: Method<any>,
	context: ClassMethodDecoratorContext,
): void;
export function dispose(config?: DisposeConfig): DisposeDecorator;
export function dispose(inputOrValue?: unknown, context?: unknown): unknown {
	if (arguments.length === 2 && isDecoratorCall(context)) {
		wire(inputOrValue as Method<any>, context as ClassMethodDecoratorContext, {});
		return;
	}

	const config = (inputOrValue ?? {}) as DisposeConfig;
	return (value: Method<any>, decoratorContext: ClassMethodDecoratorContext): void => {
		wire(value, decoratorContext, config);
	};
}
