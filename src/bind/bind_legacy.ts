import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";

export function bind(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function bind(): MethodDecorator;
export function bind(
	targetOrEmpty?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (_target: object, k: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@bind is applicable only on methods.");
		}

		const original = desc.value as (...args: unknown[]) => unknown;

		return {
			configurable: true,
			enumerable: false,
			get(this: unknown): unknown {
				const bound = original.bind(this);
				Object.defineProperty(this, k, {
					value: bound,
					configurable: true,
					writable: true,
				});
				return bound;
			},
		};
	};

	if (isLegacyDecoratorCall(targetOrEmpty, key, descriptor)) {
		return decorate(targetOrEmpty as object, key as string | symbol, descriptor as PropertyDescriptor);
	}

	return decorate;
}
