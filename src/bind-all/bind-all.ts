import { assertClassDecorator } from "../common/decorators.js";

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

export function bindAll() {
	return function<Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>): Class {
		assertClassDecorator("bindAll", value, context);
		const methodNames = getBindableMethodNames(value.prototype);

		return class extends value {
			constructor(...args: any[]) {
				super(...args);

				for (const methodName of methodNames) {
					const method = (this as Record<PropertyKey, unknown>)[methodName];
					if (typeof method === "function") {
						(this as Record<PropertyKey, unknown>)[methodName] = method.bind(this);
					}
				}
			}
		} as Class;
	};
}
