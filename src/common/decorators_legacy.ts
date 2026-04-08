/**
 * Detects whether a function is being called with a legacy method decorator
 * signature: `(target, propertyKey, descriptor)` where `propertyKey` is a
 * string/symbol and `descriptor` is a PropertyDescriptor.
 *
 * Used to distinguish bare `@decorator` usage from factory `@decorator(opts)`
 * usage in dual-signature legacy decorators.
 */
export function isLegacyDecoratorCall(target: unknown, key: unknown, descriptor: unknown): boolean {
	return (typeof target === "object" || typeof target === "function")
		&& target !== null
		&& (typeof key === "string" || typeof key === "symbol")
		&& typeof descriptor === "object"
		&& descriptor !== null
		&& ("value" in (descriptor as object) || "get" in (descriptor as object));
}

export function assertLegacyAccessorDecorator(decoratorName: string, descriptor: PropertyDescriptor): void {
	const isAccessor = !("value" in descriptor)
		&& !("writable" in descriptor)
		&& (typeof descriptor.get === "function" || typeof descriptor.set === "function");

	if (!isAccessor) {
		throw new Error(`@${decoratorName} is applicable only on accessors.`);
	}
}

export function assertLegacyGetterDecorator(decoratorName: string, descriptor: PropertyDescriptor): void {
	const isGetter = !("value" in descriptor)
		&& !("writable" in descriptor)
		&& typeof descriptor.get === "function";

	if (!isGetter) {
		throw new Error(`@${decoratorName} is applicable only on getters.`);
	}
}
