import type { AnyFunction } from "../common/types.js";

/** A standard (TC39) method decorator: `(value, context) => replacement | void`. */
type StandardMethodDecorator = (value: any, context: any) => unknown;

/**
 * Adapts a standard method decorator to the legacy `experimentalDecorators`
 * signature that TypeORM and NestJS projects are locked to: `@legacy(retry(3))`.
 *
 * Works with every decorator that wraps the method. Not supported: `bind`,
 * `dispose`, `periodic` (they need `addInitializer`) and the accessor
 * decorators `readonly`, `lazy`.
 */
export function legacy(decorator: StandardMethodDecorator): MethodDecorator {
	return (target, key, descriptor) => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@legacy is applicable only on methods.");
		}

		const context: ClassMethodDecoratorContext = {
			kind: "method",
			name: key,
			static: typeof target === "function",
			private: false,
			access: {
				has: (object) => key in (object as object),
				get: (object) => (object as Record<PropertyKey, unknown>)[key] as AnyFunction,
			},
			addInitializer() {
				throw new Error(`@legacy: ${String(key)} uses a decorator that needs addInitializer, which legacy decorators cannot provide.`);
			},
			metadata: {},
		};

		const replaced = decorator(descriptor.value, context);
		if (typeof replaced === "function") {
			(descriptor as PropertyDescriptor).value = replaced;
		}

		return descriptor;
	};
}
