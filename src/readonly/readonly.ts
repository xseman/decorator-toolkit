import {
	assertAccessorDecorator,
	overloaded,
	propertyName,
} from "../common/decorators.js";

type ReadonlyDecorator = <This, Value>(
	value: ClassAccessorDecoratorTarget<This, Value>,
	context: ClassAccessorDecoratorContext<This, Value>,
) => ClassAccessorDecoratorResult<This, Value>;

/** Makes an `accessor` member throw on assignment after initialization. */
export function readonly<This, Value>(
	value: ClassAccessorDecoratorTarget<This, Value>,
	context: ClassAccessorDecoratorContext<This, Value>,
): ClassAccessorDecoratorResult<This, Value>;
export function readonly(): ReadonlyDecorator;
export function readonly(...args: unknown[]): unknown {
	return overloaded(args, (): ReadonlyDecorator => (value, context) => {
		assertAccessorDecorator("readonly", value, context);
		const name = propertyName(context.name);

		return {
			get() {
				return value.get.call(this);
			},
			set() {
				const owner = (this as { constructor?: { name?: string; }; }).constructor?.name || "Object";
				throw new TypeError(`Cannot assign to read only property '${name}' of object '#<${owner}>'`);
			},
		};
	});
}
