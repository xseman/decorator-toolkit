type Constructor = new(...args: any[]) => object;

function getBindableMethodNames(prototype: object): PropertyKey[] {
	return [
		...Object.getOwnPropertyNames(prototype),
		...Object.getOwnPropertySymbols(prototype),
	].filter((propertyName) => {
		if (propertyName === "constructor") {
			return false;
		}

		const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
		return typeof descriptor?.value === "function";
	});
}

function applyBindAll<T extends Constructor>(constructor: T): T {
	const methodNames = getBindableMethodNames(constructor.prototype);

	return class extends constructor {
		constructor(...args: any[]) {
			super(...args);

			for (const methodName of methodNames) {
				const method = (this as Record<PropertyKey, unknown>)[methodName];
				if (typeof method === "function") {
					(this as Record<PropertyKey, unknown>)[methodName] = method.bind(this);
				}
			}
		}
	} as T;
}

export function bindAll<T extends Constructor>(constructor: T): T;
export function bindAll(): ClassDecorator;
export function bindAll(constructorOrEmpty?: unknown): unknown {
	if (typeof constructorOrEmpty === "function") {
		return applyBindAll(constructorOrEmpty as Constructor);
	}

	return (constructor: Constructor): Constructor => {
		return applyBindAll(constructor);
	};
}
