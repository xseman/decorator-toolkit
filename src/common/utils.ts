export function isPromise(obj: unknown): obj is Promise<unknown> {
	return Boolean(obj) && typeof (obj as Promise<unknown>).then === "function";
}

/**
 * Default key for argument-keyed stores. A single non-string primitive is its own
 * key, so `undefined`, `null`, `NaN` and bigints stay distinct in a `Map`; anything
 * else is `JSON.stringify(args)`, which is always a string, so the two never collide.
 *
 * shortcut: values JSON cannot tell apart (Map, Set, functions, `undefined` vs `null` among
 * several arguments) share a key; callers with such arguments pass a `keyResolver`.
 */
export function argsKey(args: unknown[]): unknown {
	const first = args[0];
	const primitive = first === null || !["object", "function", "string"].includes(typeof first);

	return args.length === 1 && primitive ? first : JSON.stringify(args);
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
