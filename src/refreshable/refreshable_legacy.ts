import {
	isWeakMapKey,
	resolveCallable,
} from "../common/utils.js";
import type { RefreshableConfig } from "./refreshable.js";

export type { RefreshableConfig };

/**
 * Legacy version of `@refreshable`. Apply to an explicit getter/setter pair.
 *
 * Note: unlike the TC39 variant (which starts the interval at construction via
 * `addInitializer`), this variant initialises the refresh interval on the first
 * `get` access to the property.
 */
export function refreshable<This = any, Value = unknown>(
	config: RefreshableConfig<This, Value>,
): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		const originalGet = descriptor.get as ((this: This) => Value | null) | undefined;
		const originalSet = descriptor.set as ((this: This, v: Value | null) => void) | undefined;

		const intervalHandlers = new WeakMap<object, ReturnType<typeof setInterval>>();

		const startRefresh = function(this: This): void {
			const self = this;

			if (!isWeakMapKey(self) || intervalHandlers.has(self as object)) {
				return;
			}

			const update = async (): Promise<void> => {
				const dataProvider = resolveCallable(self, config.dataProvider) as () => Promise<Value>;
				const data = await dataProvider();

				if (originalSet) {
					originalSet.call(self, data);
				}
			};

			const handler = setInterval((): void => {
				void update();
			}, config.intervalMs);

			if (typeof (handler as { unref?: () => void; }).unref === "function") {
				(handler as { unref: () => void; }).unref();
			}

			intervalHandlers.set(self as object, handler);
			setTimeout((): void => {
				void update();
			}, 0);
		};

		return {
			...descriptor,
			get(this: This): Value | null {
				startRefresh.call(this);
				return originalGet ? originalGet.call(this) : null;
			},
			set(this: This, v: Value | null): void {
				if (v === null && isWeakMapKey(this)) {
					const handler = intervalHandlers.get(this as object);
					if (handler !== undefined) {
						clearInterval(handler);
						intervalHandlers.delete(this as object);
					}
				}

				if (originalSet) {
					originalSet.call(this, v);
				}
			},
		};
	};
}
