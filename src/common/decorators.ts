import type { AnyFunction } from "./types.js";

type RuntimeDecoratorContext = {
	kind: string;
	name?: string | symbol;
	private?: boolean;
};

function isRuntimeDecoratorContext(context: unknown): context is RuntimeDecoratorContext {
	return typeof context === "object"
		&& context !== null
		&& "kind" in context
		&& typeof (context as { kind?: unknown; }).kind === "string";
}

export function isDecoratorCall(context: unknown): boolean {
	return isRuntimeDecoratorContext(context);
}

export function isMethodDecoratorCall(value: unknown, context: unknown): boolean {
	return typeof value === "function" && isRuntimeDecoratorContext(context) && context.kind === "method";
}

export function isClassDecoratorCall(value: unknown, context: unknown): boolean {
	return typeof value === "function" && isRuntimeDecoratorContext(context) && context.kind === "class";
}

export function isAccessorDecoratorCall(value: unknown, context: unknown): boolean {
	return value !== null && typeof value === "object" && isRuntimeDecoratorContext(context) && context.kind === "accessor";
}

export function assertMethodDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): asserts value is AnyFunction {
	if (context.kind !== "method" || typeof value !== "function") {
		throw new Error(`@${decoratorName} is applicable only on methods.`);
	}

	if (context.private) {
		throw new Error(`@${decoratorName} does not support private hash methods.`);
	}
}

export function assertClassDecorator(
	decoratorName: string,
	value: unknown,
	context: { kind: string; },
): asserts value is AnyFunction {
	if (context.kind !== "class" || typeof value !== "function") {
		throw new Error(`@${decoratorName} is applicable only on classes.`);
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
