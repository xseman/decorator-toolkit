import { assertClassDecorator } from "../common/decorators.js";

type Constructor = new(...args: any[]) => object;

export type BindAllDecorator =
	& (<Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>) => Class)
	& (<Class extends Constructor>(value: Class) => Class);

function ownMethodNames(prototype: object): PropertyKey[] {
	return Reflect.ownKeys(prototype).filter((name) => name !== "constructor" && typeof Object.getOwnPropertyDescriptor(prototype, name)?.value === "function");
}

/** Binds every method declared on the class to each instance at construction. */
export function bindAll<Class extends Constructor>(value: Class, context: ClassDecoratorContext<Class>): Class;
export function bindAll<Class extends Constructor>(value: Class): Class;
export function bindAll(): BindAllDecorator;
export function bindAll(...args: unknown[]): unknown {
	const decorate = (value: unknown, context?: unknown): Constructor => {
		if (context !== undefined) {
			assertClassDecorator("bindAll", value, context as { kind: string; });
		} else if (typeof value !== "function") {
			throw new Error("@bindAll is applicable only on classes.");
		}

		const base = value as Constructor;
		const names = ownMethodNames(base.prototype);

		return {
			[base.name]: class extends base {
				constructor(...ctorArgs: any[]) {
					super(...ctorArgs);

					for (const name of names) {
						const method = (this as Record<PropertyKey, unknown>)[name];
						if (typeof method === "function") {
							(this as Record<PropertyKey, unknown>)[name] = method.bind(this);
						}
					}
				}
			},
		}[base.name]!;
	};

	return args.length === 0 ? decorate : decorate(args[0], args[1]);
}
