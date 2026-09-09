import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";

export type ConcurrentDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	) => AsyncMethod<This, Args, Return>
>;

type Job = { run: () => Promise<unknown>; };
type State = { running: number; queue: Job[]; };

/** Bulkhead: at most `limit` calls run at once per instance; the rest queue in FIFO order. `limit` 1 serializes. */
export function concurrent<This, Args extends unknown[] = unknown[], Return = unknown>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return>;
export function concurrent(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function concurrent(limit?: number): ConcurrentDecorator;
export function concurrent(...args: unknown[]): unknown {
	return overloaded(args, (limit: number = 1) =>
		methodDecorator<ConcurrentDecorator>("concurrent", (value) => {
			// ponytail: O(n) shift; ring buffer if queues exceed ~10k
			const slot = perInstance<State>(() => ({ running: 0, queue: [] }));

			const drain = (state: State): void => {
				while (state.running < limit && state.queue.length > 0) {
					state.running += 1;
					void state.queue.shift()!.run().finally(() => {
						state.running -= 1;
						drain(state);
					});
				}
			};

			return function(this: unknown, ...callArgs: unknown[]): Promise<unknown> {
				const state = slot(this);

				return new Promise<unknown>((resolve, reject) => {
					state.queue.push({
						run: () => new Promise<unknown>((start) => start(value.apply(this, callArgs))).then(resolve, reject),
					});
					drain(state);
				});
			};
		}));
}
