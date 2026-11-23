type Disposer = (this: any) => unknown;

/** At most once per instance, like a disposed `DisposableStack`: both chains can reach the same disposer. */
function oncePerInstance(fn: Disposer): Disposer {
	const disposed = new WeakSet<object>();

	return function(this: object): unknown {
		if (disposed.has(this)) {
			return undefined;
		}

		disposed.add(this);
		return fn.call(this);
	};
}

/**
 * Registers `fn` on the instance's `Symbol.dispose` (or `Symbol.asyncDispose`).
 * Disposers run in reverse registration order, like `using` and `DisposableStack`,
 * each at most once per instance, and a throwing one does not skip the rest.
 *
 * `await using` calls only `Symbol.asyncDispose`, so once an async disposer exists
 * that chain carries every disposer, sync ones included; `Symbol.dispose` keeps
 * the sync ones only.
 */
export function addDisposer(instance: object, fn: Disposer, async = false): void {
	const symbol = async ? Symbol.asyncDispose : Symbol.dispose;
	if (typeof symbol !== "symbol") {
		throw new Error(`Symbol.${async ? "asyncDispose" : "dispose"} is not available in this runtime.`);
	}

	const target = instance as Record<symbol, unknown>;
	const previousSync = typeof target[Symbol.dispose] === "function" ? target[Symbol.dispose] as Disposer : undefined;
	const previousAsync = typeof target[Symbol.asyncDispose] === "function" ? target[Symbol.asyncDispose] as Disposer : undefined;
	const previousAll = previousAsync ?? previousSync;
	const run = oncePerInstance(fn);

	// shortcut: when several disposers throw, only the last thrown error propagates; wrap them in SuppressedError once Node 22 is dropped
	if (!async) {
		target[Symbol.dispose] = function(this: unknown): void {
			try {
				run.call(this);
			} finally {
				previousSync?.call(this);
			}
		};
	}

	if (async || previousAsync !== undefined) {
		target[Symbol.asyncDispose] = async function(this: unknown): Promise<void> {
			try {
				await run.call(this);
			} finally {
				await previousAll?.call(this);
			}
		};
	}
}
