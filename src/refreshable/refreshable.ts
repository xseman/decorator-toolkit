import { assertAccessorDecorator } from "../common/decorators.js";
import type { AsyncMethod } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

export interface RefreshableConfig<This = any, Value = unknown> {
	dataProvider: AsyncMethod<This, [], Value> | keyof This;
	intervalMs: number;
}

export function refreshable<This = any, Value = unknown>(config: RefreshableConfig<This, Value>) {
	return function(
		value: ClassAccessorDecoratorTarget<This, Value | null>,
		context: ClassAccessorDecoratorContext<This, Value | null>,
	) {
		assertAccessorDecorator("refreshable", value, context);

		const intervalHandlers = new WeakMap<object, ReturnType<typeof setInterval>>();

		const updateValue = async function(this: This): Promise<void> {
			const dataProvider = resolveCallable<This, Promise<Value>>(this, config.dataProvider);
			const data = await dataProvider();
			value.set.call(this, data as Value | null);
		};

		context.addInitializer(function(this: This): void {
			const intervalHandler = setInterval(() => {
				void updateValue.call(this);
			}, config.intervalMs);

			if (typeof (intervalHandler as { unref?: () => void; }).unref === "function") {
				intervalHandler.unref();
			}

			intervalHandlers.set(this as object, intervalHandler);
			setTimeout(() => {
				void updateValue.call(this);
			}, 0);
		});

		return {
			get(this: This): Value | null {
				return value.get.call(this);
			},
			set(this: This, nextValue: Value | null): void {
				if (nextValue === null) {
					const intervalHandler = intervalHandlers.get(this as object);
					if (intervalHandler !== undefined) {
						clearInterval(intervalHandler);
						intervalHandlers.delete(this as object);
					}
				}
			},
			init(initialValue: Value | null): Value | null {
				return initialValue;
			},
		};
	};
}
