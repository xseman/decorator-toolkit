import type { AnyFunction } from "./types.js";

type RuntimeDecoratorContext = {
	kind: string;
	name: string | symbol;
	private?: boolean;
};

export function assertMethodDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): asserts value is AnyFunction {
	if (context.kind !== "method" || typeof value !== "function" || context.private) {
		throw new Error(`@${decoratorName} is applicable only on methods.`);
	}
}

export function assertAccessorDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): void {
	if (context.kind !== "accessor" || value === null || typeof value !== "object" || context.private) {
		throw new Error(`@${decoratorName} is applicable only on accessors.`);
	}
}

export function propertyName(name: string | symbol): string {
	return typeof name === "string" ? name : (name.description ?? name.toString());
}
