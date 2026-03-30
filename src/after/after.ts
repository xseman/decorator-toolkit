import { assertMethodDecorator } from "../common/decorators.js";
import type { Method } from "../common/types.js";
import {
	isPromise,
	resolveCallable,
} from "../common/utils.js";

export type AfterFunc<Return = unknown, Args extends unknown[] = unknown[]> = (params: AfterParams<Return, Args>) => unknown;

export interface AfterConfig<This = any, Return = unknown, Args extends unknown[] = unknown[]> {
	func: AfterFunc<Return, Args> | keyof This;
	wait?: boolean;
}

export interface AfterParams<Return = unknown, Args extends unknown[] = unknown[]> {
	args: Args;
	response: Return;
}

function createAfterMethod<This, Args extends unknown[] = unknown[], Return = unknown, Response = Return>(
	originalMethod: Method<This, Args, Return>,
	config: AfterConfig<This, Response, Args>,
): Method<This, Args, Return> {
	const resolvedConfig = {
		wait: false,
		...config,
	};

	return function(this: This, ...args: Args): Return {
		const afterFunc = resolveCallable<This, unknown>(this, resolvedConfig.func);
		const response = originalMethod.apply(this, args);

		if (!resolvedConfig.wait) {
			afterFunc({
				args,
				response: response as unknown as Response,
			});
			return response;
		}

		if (isPromise(response)) {
			return Promise.resolve(response).then((resolvedResponse) => {
				afterFunc({
					args,
					response: resolvedResponse as Response,
				});
				return resolvedResponse;
			}) as Return;
		}

		afterFunc({
			args,
			response: response as unknown as Response,
		});
		return response;
	} as Method<This, Args, Return>;
}

export function after<This = any, Response = unknown, Args extends unknown[] = unknown[]>(
	config: AfterConfig<This, Response, Args>,
) {
	return function<Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	): Method<This, Args, Return> {
		assertMethodDecorator("after", value, context);
		return createAfterMethod(value, config);
	};
}
