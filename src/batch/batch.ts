import {
	type Dual,
	methodDecorator,
	overloaded,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { AsyncMethod } from "../common/types.js";
import { sleep } from "../common/utils.js";

export type BatchDecorator = Dual<
	<This, Item, Result>(
		value: AsyncMethod<This, [items: Item[]], Result[]>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, [items: Item[]], Result[]>>,
	) => AsyncMethod<This, [items: Item[]], Result[]>
>;

type Pending = { items: unknown[]; results: Promise<unknown[]>; };

/**
 * Merges calls made within `windowMs` (default 0: the current tick) into one call
 * with all their items, per instance. The method must return one result per item,
 * in the same order; each caller gets the results for its own items.
 */
export function batch<This, Item, Result>(
	value: AsyncMethod<This, [items: Item[]], Result[]>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, [items: Item[]], Result[]>>,
): AsyncMethod<This, [items: Item[]], Result[]>;
export function batch(target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
export function batch(windowMs?: number): BatchDecorator;
export function batch(...args: unknown[]): unknown {
	return overloaded(args, (windowMs: number = 0) => {
		if (!(windowMs >= 0)) {
			throw new Error("@batch: windowMs must be a non-negative number.");
		}

		return methodDecorator<BatchDecorator>("batch", (value) => {
			const slot = perInstance<{ pending?: Pending; }>(() => ({}));

			return function(this: unknown, items: unknown[]): Promise<unknown[]> {
				const state = slot(this);

				if (state.pending === undefined) {
					const opened: Pending = {
						items: [],
						results: sleep(windowMs).then(async () => {
							state.pending = undefined;
							const results: unknown = await value.call(this, opened.items);

							if (!Array.isArray(results) || results.length !== opened.items.length) {
								const got = Array.isArray(results) ? results.length : typeof results;
								throw new Error(`@batch: expected ${opened.items.length} results, got ${got}.`);
							}

							return results;
						}),
					};
					state.pending = opened;
				}

				const pending = state.pending;
				const start = pending.items.length;
				// concat, not push(...items): spreading a large array overflows the call stack
				pending.items = pending.items.concat(items);

				return pending.results.then((results) => results.slice(start, start + items.length));
			};
		});
	});
}
