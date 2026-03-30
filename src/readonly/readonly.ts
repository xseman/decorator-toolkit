import {
	assertAccessorDecorator,
	propertyName,
} from "../common/decorators.js";

function getObjectName(value: unknown): string {
	if (typeof value === "object" && value !== null) {
		const constructor = (value as { constructor?: { name?: string; }; }).constructor;
		if (constructor?.name) {
			return constructor.name;
		}
	}

	return "Object";
}

export function readonly() {
	return function<This, Value>(
		value: ClassAccessorDecoratorTarget<This, Value>,
		context: ClassAccessorDecoratorContext<This, Value>,
	) {
		assertAccessorDecorator("readonly", value, context);

		const name = propertyName(context.name);

		return {
			get(this: This): Value {
				return value.get.call(this);
			},
			set(this: This, _nextValue: Value): void {
				throw new TypeError(`Cannot assign to read only property '${name}' of object '#<${getObjectName(this)}>'`);
			},
			init(initialValue: Value): Value {
				return initialValue;
			},
		};
	};
}
