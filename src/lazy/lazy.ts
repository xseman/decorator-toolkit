import {
	assertGetterDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";

type LazyDecorator = <This, Value>(
	value: (this: This) => Value,
	context: ClassGetterDecoratorContext<This, Value>,
) => (this: This) => Value;

/** Computes a getter once per instance and returns the cached value afterwards. */
export function lazy<This, Value>(
	value: (this: This) => Value,
	context: ClassGetterDecoratorContext<This, Value>,
): (this: This) => Value;
export function lazy(): LazyDecorator;
export function lazy(...args: unknown[]): unknown {
	return overloaded(args, (): LazyDecorator => (value, context) => {
		assertGetterDecorator("lazy", value, context);
		type This = ThisParameterType<typeof value>;
		type Value = ReturnType<typeof value>;

		const slot = perInstance<{ value?: Value; }>(() => ({}));

		return function(this: This): Value {
			const state = slot(this);
			if (!("value" in state)) {
				state.value = value.call(this);
			}

			return state.value as Value;
		};
	});
}
