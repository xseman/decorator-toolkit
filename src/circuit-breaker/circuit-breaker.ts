import {
	type Dual,
	methodDecorator,
} from "../common/decorators.js";
import { perInstance } from "../common/state.js";
import type { Method } from "../common/types.js";
import { isPromise } from "../common/utils.js";

export interface CircuitBreakerConfig {
	/** Consecutive failures that open the circuit. */
	failures: number;
	/** How long the circuit stays open before a single probe call is let through. */
	resetMs: number;
}

export class CircuitOpenError extends Error {
	override readonly name = "CircuitOpenError";

	constructor(cause: unknown) {
		super("Circuit is open", { cause: cause });
	}
}

export type CircuitBreakerDecorator = Dual<
	<This, Args extends unknown[] = unknown[], Return = unknown>(
		value: Method<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, Method<This, Args, Return>>,
	) => Method<This, Args, Return>
>;

type State = {
	failures: number;
	openedAt?: number;
	lastError?: unknown;
	async: boolean;
	/** Bumped on open and close so results of calls admitted in an older generation are ignored. */
	gen: number;
};

/**
 * Closed → open after `failures` consecutive failures; open calls fail fast with
 * `CircuitOpenError`; after `resetMs` one probe is admitted and its outcome closes
 * or re-opens the circuit.
 */
export function circuitBreaker(config: CircuitBreakerConfig): CircuitBreakerDecorator {
	if (!(config.failures >= 1) || !(config.resetMs >= 0)) {
		throw new Error("@circuitBreaker: failures must be >= 1 and resetMs >= 0.");
	}

	return methodDecorator("circuitBreaker", (value) => {
		const slot = perInstance<State>(() => ({ failures: 0, async: false, gen: 0 }));

		return function(this: unknown, ...args: unknown[]): unknown {
			const state = slot(this);
			const now = performance.now();

			if (state.openedAt !== undefined) {
				if (now - state.openedAt < config.resetMs) {
					const error = new CircuitOpenError(state.lastError);
					if (state.async) {
						return Promise.reject(error);
					}
					throw error;
				}

				// half-open: admit this probe, keep everyone else out until it settles
				state.openedAt = now;
			}

			const gen = state.gen;
			const settle = (ok: boolean, error?: unknown): void => {
				if (state.gen !== gen) {
					return;
				}

				if (ok) {
					if (state.openedAt !== undefined) {
						state.gen += 1;
					}
					state.openedAt = undefined;
					state.failures = 0;
					return;
				}

				state.lastError = error;
				state.failures += 1;

				if (state.openedAt !== undefined) {
					state.openedAt = performance.now();
				} else if (state.failures >= config.failures) {
					state.openedAt = performance.now();
					state.gen += 1;
				}
			};

			try {
				const result = value.apply(this, args);
				state.async = isPromise(result);

				if (isPromise(result)) {
					return result.then(
						(resolved) => {
							settle(true);
							return resolved;
						},
						(error) => {
							settle(false, error);
							throw error;
						},
					);
				}

				settle(true);
				return result;
			} catch (error) {
				settle(false, error);
				throw error;
			}
		};
	});
}
