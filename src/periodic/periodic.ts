import {
	assertMethodDecorator,
	type Dual,
	dual,
} from "../common/decorators.js";
import { addDisposer } from "../common/dispose.js";
import { createInterval } from "../common/timer.js";
import type { Method } from "../common/types.js";
import { resolveCallable } from "../common/utils.js";

export interface PeriodicConfig<This = any> {
	intervalMs: number;
	/** Also run once right after construction. Default `false`. */
	immediate?: boolean;
	/** `"skip"` (default) drops a tick while the previous async run is still pending. */
	overlap?: "skip" | "allow";
	onError?: keyof This | ((error: unknown) => void | Promise<void>);
}

export type PeriodicDecorator = Dual<(value: Method<any>, context: ClassMethodDecoratorContext<any>) => void>;

/**
 * Calls the method every `intervalMs` from construction until the instance is
 * disposed (`using`). Needs a class initializer, so it is not available with
 * legacy `experimentalDecorators`.
 */
export function periodic<This>(config: PeriodicConfig<This>): PeriodicDecorator;
export function periodic(intervalMs: number): PeriodicDecorator;
export function periodic(input: number | PeriodicConfig): PeriodicDecorator {
	const config: PeriodicConfig = typeof input === "number" ? { intervalMs: input } : input;

	if (!(config.intervalMs > 0)) {
		throw new Error("@periodic: intervalMs must be a positive number.");
	}

	return dual<PeriodicDecorator>(
		(value, context: ClassMethodDecoratorContext) => {
			assertMethodDecorator("periodic", value, context);

			if (context.static) {
				throw new Error("@periodic does not support static methods.");
			}

			context.addInitializer(function(this: unknown): void {
				const instance = this as object;
				let running = false;

				const run = async (): Promise<void> => {
					try {
						await value.call(instance);
					} catch (error) {
						if (config.onError !== undefined) {
							await resolveCallable<any, unknown>(instance, config.onError)(error);
						}
					}
				};

				const tick = (): void => {
					if (config.overlap !== "allow" && running) {
						return;
					}

					running = true;
					void run().catch(() => undefined).finally(() => {
						running = false;
					});
				};

				const handle = createInterval(tick, config.intervalMs);
				addDisposer(instance, () => handle.clear());

				if (config.immediate) {
					tick();
				}
			});
		},
		() => {
			throw new Error("@periodic needs a class initializer, which is not available with experimentalDecorators.");
		},
	);
}
