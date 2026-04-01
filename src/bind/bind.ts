import {
	assertMethodDecorator,
	isDecoratorCall,
} from "../common/decorators.js";
import type { Method } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

type BindDecorator<This = any> = <Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
) => void;

export function bind<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: Method<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
): void;
export function bind<This = any>(): BindDecorator<This>;
export function bind(inputOrValue?: unknown, context?: unknown): unknown {
	const decorate: BindDecorator = function<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		decoratorContext: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): void {
		assertMethodDecorator("bind", value, decoratorContext);
		const methodName = decoratorContext.name;

		decoratorContext.addInitializer(function(this: This): void {
			(this as Record<PropertyKey, unknown>)[methodName as PropertyKey] = resolveCallable(
				this,
				methodName as keyof This,
			) as Method<This, Args, Return>;
		});
	};

	if (isDecoratorCall(context)) {
		return decorate(
			inputOrValue as Method<any, unknown[], unknown>,
			context as ClassMethodDecoratorContext<any, Method<any, unknown[], unknown>>,
		);
	}

	return decorate;
}
