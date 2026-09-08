import {
	assertMethodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";

type ConcurrentDecorator = <This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
) => AsyncMethod<This, Args, Return>;

type Job = { run: () => Promise<unknown>; };

/** Bulkhead: at most `limit` calls run at once per instance; the rest queue in FIFO order. `limit` 1 serializes. */
export function concurrent<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function concurrent(limit?: number): ConcurrentDecorator;
export function concurrent(...args: unknown[]): unknown {
	return overloaded(args, (limit: number = 1): ConcurrentDecorator =>
	<This, Args extends unknown[], Return>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> => {
		assertMethodDecorator("concurrent", value, context);

		// ponytail: O(n) shift; ring buffer if queues exceed ~10k
		const slot = perInstance(() => ({ running: 0, queue: [] as Job[] }));

		const drain = (state: { running: number; queue: Job[]; }): void => {
			while (state.running < limit && state.queue.length > 0) {
				state.running += 1;
				void state.queue.shift()!.run().finally(() => {
					state.running -= 1;
					drain(state);
				});
			}
		};

		return function(this: This, ...callArgs: Args): Promise<Return> {
			const state = slot(this);

			return new Promise<Return>((resolve, reject) => {
				state.queue.push({
					run: () => new Promise<Return>((start) => start(value.apply(this, callArgs))).then(resolve, reject),
				});
				drain(state);
			});
		};
	});
}
