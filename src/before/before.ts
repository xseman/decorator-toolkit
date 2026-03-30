import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export interface BeforeConfig<This = any> {
	func: ((...args: any[]) => unknown) | keyof This;
	wait?: boolean;
}

function createBeforeMethod<This, Args extends unknown[] = unknown[], Return = unknown>(
	originalMethod: Method<This, Args, Return>,
	config: BeforeConfig<This>,
): Method<This, Args, Return> {
	const resolvedConfig = {
		wait: false,
		...config,
	};

	return function(this: This, ...args: Args): Return {
		const beforeFunc = resolveCallable<This, unknown>(this, resolvedConfig.func);

		if (!resolvedConfig.wait) {
			beforeFunc();
			return originalMethod.apply(this, args);
		}

		const beforeResult = beforeFunc();
		if (isPromise(beforeResult)) {
			return Promise.resolve(beforeResult).then(() => {
				return originalMethod.apply(this, args);
			}) as Return;
		}

		return originalMethod.apply(this, args);
	} as Method<This, Args, Return>;
}

export function before<This = any>(config: BeforeConfig<This>) {
	return function<Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("before", value, context);
		return createBeforeMethod(value, config);
	};
}
