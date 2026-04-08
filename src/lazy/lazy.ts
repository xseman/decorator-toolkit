import {
	assertGetterDecorator,
	isDecoratorCall,
} from "../common/decorators.js";

type LazyDecorator = <This, Value>(
	value: (this: This) => Value,
	context: ClassGetterDecoratorContext<This, Value>,
) => (this: This) => Value;

export function lazy<This, Value>(
	value: (this: This) => Value,
	context: ClassGetterDecoratorContext<This, Value>,
): (this: This) => Value;
export function lazy(): LazyDecorator;
export function lazy(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate: LazyDecorator = <This, Value>(
		value: (this: This) => Value,
		decoratorContext: ClassGetterDecoratorContext<This, Value>,
	): (this: This) => Value => {
		assertGetterDecorator("lazy", value, decoratorContext as any);

		const cache = new WeakMap<object, Value>();

		return function(this: This): Value {
			const self = this as object;
			if (cache.has(self)) {
				return cache.get(self) as Value;
			}

			const result = value.call(this);
			cache.set(self, result);
			return result;
		};
	};

	if (arguments.length === 2 && isDecoratorCall(context)) {
		return decorate(inputOrValue as (this: any) => unknown, context as ClassGetterDecoratorContext<any, unknown>);
	}

	return decorate;
}
