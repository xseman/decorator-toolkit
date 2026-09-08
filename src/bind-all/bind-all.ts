import {
	assertClassDecorator,
	overloaded,
} from "../common/decorators.js";

type Constructor = new(...args: any[]) => object;

type BindAllDecorator = <Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>) => Class;

function ownMethodNames(prototype: object): PropertyKey[] {
	return Reflect.ownKeys(prototype).filter((name) => name !== "constructor" && typeof Object.getOwnPropertyDescriptor(prototype, name)?.value === "function");
}

/** Binds every method declared on the class to each instance at construction. */
export function bindAll<Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>): Class;
export function bindAll(): BindAllDecorator;
export function bindAll(...args: unknown[]): unknown {
	return overloaded(args, (): BindAllDecorator => <Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>): Class => {
		assertClassDecorator("bindAll", value, context);
		const names = ownMethodNames(value.prototype);

		return class extends value {
			constructor(...ctorArgs: any[]) {
				super(...ctorArgs);

				for (const name of names) {
					const method = (this as Record<PropertyKey, unknown>)[name];
					if (typeof method === "function") {
						(this as Record<PropertyKey, unknown>)[name] = method.bind(this);
					}
				}
			}
		} as Class;
	});
}
