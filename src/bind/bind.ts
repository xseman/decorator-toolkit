import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

export function bind<This = any>() {
	return function<Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): void {
		assertMethodDecorator("bind", value, context);
		const methodName = context.name;

		context.addInitializer(function(this: This): void {
			(this as Record<PropertyKey, unknown>)[methodName as PropertyKey] = resolveCallable(
				this,
				methodName as keyof This,
			) as Method<This, Args, Return>;
		});
	};
}
