import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import type { DisposeConfig } from "./dispose.js";

export type { DisposeConfig };

function wire(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
	config: DisposeConfig,
): PropertyDescriptor {
	if (typeof descriptor.value !== "function") {
		throw new Error("@dispose is applicable only on methods.");
	}

	const original = descriptor.value as (this: unknown) => unknown;
	const symbol = config.async ? Symbol.asyncDispose : Symbol.dispose;

	if (typeof symbol !== "symbol") {
		throw new Error(
			`@dispose requires ${config.async ? "Symbol.asyncDispose" : "Symbol.dispose"}, which is not available in this runtime.`,
		);
	}

	const proto = target as Record<PropertyKey, unknown>;
	const previous = proto[symbol];

	if (config.async) {
		proto[symbol] = async function(this: unknown): Promise<void> {
			if (typeof previous === "function") {
				await (previous as (this: unknown) => unknown).call(this);
			}
			await original.call(this);
		};
	} else {
		proto[symbol] = function(this: unknown): void {
			if (typeof previous === "function") {
				(previous as (this: unknown) => void).call(this);
			}
			original.call(this);
		};
	}

	return descriptor;
}

export function dispose(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function dispose(config?: DisposeConfig): MethodDecorator;
export function dispose(
	targetOrConfig?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	if (isLegacyDecoratorCall(targetOrConfig, key, descriptor)) {
		return wire(targetOrConfig as object, key as string | symbol, descriptor as PropertyDescriptor, {});
	}

	const config = (targetOrConfig ?? {}) as DisposeConfig;
	return (target: object, k: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return wire(target, k, desc, config);
	};
}
