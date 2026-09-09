import {
	assertGetterDecorator,
	type Dual,
	dual,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AnyFunction } from "../common/types.js";

export type LazyDecorator = Dual<
	<This, Value>(
		value: (this: This) => Value,
		context: ClassGetterDecoratorContext<This, Value>,
	) => (this: This) => Value
>;

function once(getter: AnyFunction): AnyFunction {
	const slot = perInstance<{ value?: unknown; }>(() => ({}));

	return function(this: unknown): unknown {
		const state = slot(this);
		if (!("value" in state)) {
			state.value = getter.call(this);
		}

		return state.value;
	};
}

/** Computes a getter once per instance and returns the cached value afterwards. */
export function lazy<This, Value>(
	value: (this: This) => Value,
	context: ClassGetterDecoratorContext<This, Value>,
): (this: This) => Value;
export function lazy(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function lazy(): LazyDecorator;
export function lazy(...args: unknown[]): unknown {
	return overloaded(args, () =>
		dual<LazyDecorator>(
			(value, context) => {
				assertGetterDecorator("lazy", value, context);
				return once(value);
			},
			(_target, _key, descriptor) => {
				if (typeof descriptor.get !== "function") {
					throw new Error("@lazy is applicable only on getters.");
				}

				descriptor.get = once(descriptor.get);
				return descriptor;
			},
		));
}
