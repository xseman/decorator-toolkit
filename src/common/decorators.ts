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

/**
 * Supports both `@decorator` and `@decorator(input)`. `build(input)` returns the
 * decorator; when called bare, the decorator is built without input and applied.
 */
export function overloaded<Input, Decorator extends (value: any, context: any) => unknown>(
	args: unknown[],
	build: (input?: Input) => Decorator,
): Decorator | ReturnType<Decorator> {
	return isDecoratorCall(args[1])
		? build()(args[0], args[1]) as ReturnType<Decorator>
		: build(args[0] as Input | undefined);
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

export function assertGetterDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): asserts value is AnyFunction {
	if (context.kind !== "getter" || typeof value !== "function") {
		throw new Error(`@${decoratorName} is applicable only on getters.`);
	}

	if (context.private) {
		throw new Error(`@${decoratorName} does not support private hash getters.`);
	}
}

export function propertyName(name: string | symbol): string {
	return typeof name === "string" ? name : (name.description ?? name.toString());
}
