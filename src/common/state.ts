function isObject(value: unknown): value is object {
	return (typeof value === "object" && value !== null) || typeof value === "function";
}

/**
 * Per-instance state keyed on `this`. An unbound call (primitive `this`)
 * shares one fallback slot.
 */
export function perInstance<T>(init: () => T): (self: unknown) => T {
	const states = new WeakMap<object, T>();
	let fallback: T | undefined;

	return (self) => {
		if (!isObject(self)) {
			return fallback ??= init();
		}

		let state = states.get(self);
		if (state === undefined) {
			states.set(self, state = init());
		}

		return state;
	};
}
