import {
	assertClassDecorator,
	isDecoratorCall,
} from "../common/decorators.js";

type Constructor = new(...args: any[]) => object;

type BindAllDecorator = <Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>) => Class;

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

export function bindAll<Class extends Constructor>(
	value: Class,
	context: ClassDecoratorContext<Class>,
): Class;
export function bindAll(): BindAllDecorator;
export function bindAll(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate: BindAllDecorator = <Class extends Constructor>(
		value: Class,
		decoratorContext: ClassDecoratorContext<Class>,
	): Class => {
		assertClassDecorator("bindAll", value, decoratorContext);
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

	if (isDecoratorCall(context)) {
		return decorate(inputOrValue as Constructor, context as ClassDecoratorContext<Constructor>);
	}

	return decorate;
}
