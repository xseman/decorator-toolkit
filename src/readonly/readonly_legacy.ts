import {
	assertLegacyAccessorDecorator,
	isLegacyDecoratorCall,
} from "../common/decorators_legacy.js";

function getObjectName(value: unknown): string {
	if (typeof value === "object" && value !== null) {
		const constructor = (value as { constructor?: { name?: string; }; }).constructor;
		if (constructor?.name) {
			return constructor.name;
		}
	}

	return "Object";
}

function makeReadonlyDescriptor(k: string | symbol, desc: PropertyDescriptor): PropertyDescriptor {
	assertLegacyAccessorDecorator("readonly", desc);

	const name = typeof k === "string" ? k : (k.description ?? k.toString());
	const readonlySet = function(this: unknown): void {
		throw new TypeError(
			`Cannot assign to read only property '${name}' of object '#<${getObjectName(this)}>'`,
		);
	};

	return { ...desc, set: readonlySet };
}

export function readonly(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function readonly(): MethodDecorator;
export function readonly(
	targetOrEmpty?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	if (isLegacyDecoratorCall(targetOrEmpty, key, descriptor)) {
		return makeReadonlyDescriptor(key as string | symbol, descriptor as PropertyDescriptor);
	}

	return (_target: object, k: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return makeReadonlyDescriptor(k, desc);
	};
}
