import {
	assertAccessorDecorator,
	isDecoratorCall,
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

type ReadonlyDecorator = <This, Value>(
	value: ClassAccessorDecoratorTarget<This, Value>,
	context: ClassAccessorDecoratorContext<This, Value>,
) => ClassAccessorDecoratorResult<This, Value>;

export function readonly<This, Value>(
	value: ClassAccessorDecoratorTarget<This, Value>,
	context: ClassAccessorDecoratorContext<This, Value>,
): ClassAccessorDecoratorResult<This, Value>;
export function readonly(): ReadonlyDecorator;
export function readonly(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate: ReadonlyDecorator = <This, Value>(
		value: ClassAccessorDecoratorTarget<This, Value>,
		decoratorContext: ClassAccessorDecoratorContext<This, Value>,
	): ClassAccessorDecoratorResult<This, Value> => {
		assertAccessorDecorator("readonly", value, decoratorContext);

		const name = propertyName(decoratorContext.name);

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

	if (isDecoratorCall(context)) {
		return decorate(
			inputOrValue as ClassAccessorDecoratorTarget<any, unknown>,
			context as ClassAccessorDecoratorContext<any, unknown>,
		);
	}

	return decorate;
}
