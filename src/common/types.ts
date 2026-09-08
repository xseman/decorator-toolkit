export type AnyFunction = (this: any, ...args: any[]) => any;

export type Method<This, Args extends unknown[] = unknown[], Return = unknown> = (
	this: This,
	...args: Args
) => Return;

export type AsyncMethod<This, Args extends unknown[] = unknown[], Return = unknown> = (
	this: This,
	...args: Args
) => Promise<Return>;
