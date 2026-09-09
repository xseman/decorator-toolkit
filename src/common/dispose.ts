type Disposer = (this: any) => unknown;

/**
 * Registers `fn` on the instance's `Symbol.dispose` (or `Symbol.asyncDispose`),
 * running previously registered disposers first.
 */
export function addDisposer(instance: object, fn: Disposer, async = false): void {
	const symbol = async ? Symbol.asyncDispose : Symbol.dispose;
	if (typeof symbol !== "symbol") {
		throw new Error(`Symbol.${async ? "asyncDispose" : "dispose"} is not available in this runtime.`);
	}

	const target = instance as Record<symbol, unknown>;
	const existing = target[symbol];
	const previous = typeof existing === "function" ? existing as Disposer : undefined;

	target[symbol] = async
		? async function(this: unknown): Promise<void> {
			await previous?.call(this);
			await fn.call(this);
		}
		: function(this: unknown): void {
			previous?.call(this);
			fn.call(this);
		};
}
