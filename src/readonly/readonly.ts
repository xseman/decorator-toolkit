import {
	assertAccessorDecorator,
	type Dual,
	dual,
	overloaded,
	propertyName,
} from "../common/decorators.js";

export type ReadonlyDecorator = Dual<
	<This, Value>(
		value: ClassAccessorDecoratorTarget<This, Value>,
		context: ClassAccessorDecoratorContext<This, Value>,
	) => ClassAccessorDecoratorResult<This, Value>
>;

function readonlyError(name: string, owner: unknown): TypeError {
	const ownerName = (owner as { constructor?: { name?: string; }; })?.constructor?.name || "Object";
	return new TypeError(`Cannot assign to read only property '${name}' of object '#<${ownerName}>'`);
}

/** Makes an `accessor` member (or, with legacy decorators, a get/set pair) throw on assignment. */
export function readonly<This, Value>(
	value: ClassAccessorDecoratorTarget<This, Value>,
	context: ClassAccessorDecoratorContext<This, Value>,
): ClassAccessorDecoratorResult<This, Value>;
export function readonly(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function readonly(): ReadonlyDecorator;
export function readonly(...args: unknown[]): unknown {
	return overloaded(args, () =>
		dual<ReadonlyDecorator>(
			(value: ClassAccessorDecoratorTarget<unknown, unknown>, context: ClassAccessorDecoratorContext) => {
				assertAccessorDecorator("readonly", value, context);
				const name = propertyName(context.name);

				return {
					get(this: unknown): unknown {
						return value.get.call(this);
					},
					set(this: unknown): void {
						throw readonlyError(name, this);
					},
				};
			},
			(_target, key, descriptor) => {
				if (typeof descriptor.get !== "function" && typeof descriptor.set !== "function") {
					throw new Error("@readonly is applicable only on accessors.");
				}

				const name = propertyName(key);
				descriptor.set = function(this: unknown): void {
					throw readonlyError(name, this);
				};
				return descriptor;
			},
		));
}
