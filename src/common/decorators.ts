import type { AnyFunction } from "./types.js";

type RuntimeDecoratorContext = {
	kind: string;
	name?: string | symbol;
	private?: boolean;
};

/** The `experimentalDecorators` call form. Every decorator in this package accepts it as well. */
export type LegacyDecorator = (target: object, key: string | symbol, descriptor: PropertyDescriptor) => PropertyDescriptor;

/** A standard decorator that also accepts the legacy `experimentalDecorators` call form. */
export type Dual<Decorator> = Decorator & LegacyDecorator;

function isRuntimeDecoratorContext(context: unknown): context is RuntimeDecoratorContext {
	return typeof context === "object"
		&& context !== null
		&& "kind" in context
		&& typeof (context as { kind?: unknown; }).kind === "string";
}

export function isDecoratorCall(context: unknown): boolean {
	return isRuntimeDecoratorContext(context);
}

/** `(target, key, descriptor)`; fields and parameters arrive with no descriptor and are rejected by the callee. */
export function isLegacyCall(args: unknown[]): args is [object, string | symbol, unknown] {
	return args.length === 3 && (typeof args[1] === "string" || typeof args[1] === "symbol");
}

/** Synthesizes a standard decorator context for a legacy `(target, key, descriptor)` call. */
export function legacyContext(decoratorName: string, kind: string, target: object, name: string | symbol): any {
	return {
		kind: kind,
		name: name,
		static: typeof target === "function",
		private: false,
		access: {
			has: (object: object) => name in object,
			get: (object: Record<PropertyKey, unknown>) => object[name],
		},
		addInitializer() {
			throw new Error(`@${decoratorName} needs a class initializer, which is not available with experimentalDecorators.`);
		},
		metadata: {},
	};
}

/** Dispatches between the standard `(value, context)` and the legacy `(target, key, descriptor)` call forms. */
export function dual<Decorator>(
	standard: (value: any, context: any) => unknown,
	legacy: LegacyDecorator,
): Decorator {
	return function(...args: unknown[]): unknown {
		if (isLegacyCall(args)) {
			const [target, key, descriptor] = args;
			return legacy(target, key, typeof descriptor === "object" && descriptor !== null ? descriptor as PropertyDescriptor : {});
		}

		return standard(args[0], args[1]);
	} as Decorator;
}

/** A method decorator that replaces the method with `wrap(method, context)`, in both call forms. */
export function methodDecorator<Decorator>(
	name: string,
	wrap: (value: AnyFunction, context: ClassMethodDecoratorContext) => AnyFunction,
): Decorator {
	return dual<Decorator>(
		(value, context) => {
			assertMethodDecorator(name, value, context);
			return wrap(value, context);
		},
		(target, key, descriptor) => {
			if (typeof descriptor.value !== "function") {
				throw new Error(`@${name} is applicable only on methods.`);
			}

			descriptor.value = wrap(descriptor.value, legacyContext(name, "method", target, key));
			return descriptor;
		},
	);
}

/**
 * Supports `@decorator`, `@decorator()` and `@decorator(input)` in both call forms.
 * `build(input)` returns the decorator; a bare use builds it without input and applies it.
 */
export function overloaded<Input, Decorator extends (...args: any[]) => unknown>(
	args: unknown[],
	build: (input?: Input) => Decorator,
): Decorator | ReturnType<Decorator> {
	return isDecoratorCall(args[1]) || isLegacyCall(args)
		? build()(...args) as ReturnType<Decorator>
		: build(args[0] as Input | undefined);
}

export function assertMethodDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): asserts value is AnyFunction {
	if (!isRuntimeDecoratorContext(context) || context.kind !== "method" || typeof value !== "function") {
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
	if (!isRuntimeDecoratorContext(context) || context.kind !== "class" || typeof value !== "function") {
		throw new Error(`@${decoratorName} is applicable only on classes.`);
	}
}

export function assertAccessorDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): void {
	if (!isRuntimeDecoratorContext(context) || context.kind !== "accessor" || value === null || typeof value !== "object" || context.private) {
		throw new Error(`@${decoratorName} is applicable only on accessors.`);
	}
}

export function assertGetterDecorator(
	decoratorName: string,
	value: unknown,
	context: RuntimeDecoratorContext,
): asserts value is AnyFunction {
	if (!isRuntimeDecoratorContext(context) || context.kind !== "getter" || typeof value !== "function") {
		throw new Error(`@${decoratorName} is applicable only on getters.`);
	}

	if (context.private) {
		throw new Error(`@${decoratorName} does not support private hash getters.`);
	}
}

export function propertyName(name: string | symbol): string {
	return typeof name === "string" ? name : (name.description ?? name.toString());
}
