export function isPromise(obj: unknown): obj is Promise<unknown> {
	return Boolean(obj) && typeof (obj as Promise<unknown>).then === "function";
}

export function isWeakMapKey(value: unknown): value is object {
	return (typeof value === "object" && value !== null) || typeof value === "function";
}

export function resolveCallable<This, Return>(
	instance: This,
	input: ((...args: any[]) => Return) | keyof This,
): (...args: any[]) => Return {
	if (typeof input === "function") {
		return input.bind(instance);
	}

	const resolved = (instance as Record<PropertyKey, unknown>)[input as PropertyKey];
	if (typeof resolved !== "function") {
		throw new TypeError(`Expected ${String(input)} to resolve to a function.`);
	}

	return resolved.bind(instance) as (...args: any[]) => Return;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
