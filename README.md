<h1 align="center">decorator-toolkit</h1>

<p align="center">
	Standard resilience and control-flow patterns as TC39 decorators for TypeScript.
</p>

<p align="center">
	<a href="#installation">Installation</a> •
	<a href="#usage">Usage</a> •
	<a href="#available-decorators">Available Decorators</a> •
	<a href="#documentation">Documentation</a>
</p>

The patterns you know from Polly, resilience4j, tenacity or Go's `sync` and
`singleflight`, as one-line decorators: retry, timeout, circuit breaker,
fallback, rate limit, bulkhead, memoize, singleflight, once, debounce,
throttle. No runtime dependencies. Works in browsers, Node 22+, Bun and Deno.

## Installation

```sh
npm install decorator-toolkit
# or
bun add decorator-toolkit
```

## Usage

The package targets standard TC39 decorators (TypeScript 5+). Use a modern
compiler configuration:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "Node16",
		"moduleResolution": "Node16"
	}
}
```

This package ships its types from source, so the compiler needs the globals it
uses (`setTimeout`, `performance`, `DOMException`). A browser project gets them
from `"lib": ["DOM", ...]`; a Node project needs `@types/node`, listed in
`"types"` when you are on TypeScript 7, which no longer includes every `@types`
package automatically.

> [!NOTE]
> Method decorators apply to methods only, `bindAll` applies to classes,
> `readonly` applies to `accessor` members and `lazy` to `get` accessors.
> Private members are not supported. Decorators that need no configuration
> accept both `@decorator` and `@decorator()`.

### Resilience pipeline

```ts
import {
	circuitBreaker,
	onError,
	retry,
	timeout,
} from "decorator-toolkit";

class PricingClient {
	@onError<PricingClient, number, [string]>(() => 0) // fallback
	@circuitBreaker({ failures: 5, resetMs: 30_000 }) // stop hammering a dead service
	@retry({ retries: 3, delay: (attempt) => 200 * 2 ** attempt }) // exponential backoff
	@timeout(2_000) // DOMException "TimeoutError"
	async price(sku: string): Promise<number> {
		const response = await fetch(`https://pricing.example/${sku}`);
		return Number(await response.text());
	}
}
```

### Caching, deduplication and limits

```ts
import {
	cache,
	concurrent,
	delegate,
	rateLimit,
	runOnce,
} from "decorator-toolkit";

class Directory {
	@runOnce // lazy init, concurrent callers share the promise
	async connect(): Promise<void> {}

	@cache({ ttlMs: 5_000 }) // memoize by arguments, lazy TTL
	lookup(id: string): string {
		return `user:${id}`;
	}

	@delegate // singleflight: identical concurrent calls share one request
	async load(id: string): Promise<object> {
		return fetch(`/users/${id}`).then((r) => r.json());
	}

	@concurrent(4) // bulkhead: at most 4 in flight, the rest queue
	async sync(id: string): Promise<void> {}

	@rateLimit<Directory, [string]>({ allowedCalls: 10, timeSpanMs: 60_000, keyResolver: (id) => id })
	openProfile(id: string): string {
		return `/users/${id}`;
	}
}
```

### Lifecycle

```ts
import {
	dispose,
	lazy,
	periodic,
	readonly,
} from "decorator-toolkit";

class Session {
	@readonly
	accessor id = crypto.randomUUID();

	@lazy
	get config(): object {
		return buildExpensiveConfig(); // once per instance
	}

	@periodic({ intervalMs: 5_000, immediate: true })
	async heartbeat(): Promise<void> {}

	@dispose
	close(): void {}
}

{
	using session = new Session();
} // heartbeat stops, close() runs
```

### Imports

```ts
import {
	retry,
	timeout,
} from "decorator-toolkit";
import { cache } from "decorator-toolkit/cache";
import {
	circuitBreaker,
	CircuitOpenError,
} from "decorator-toolkit/circuit-breaker";
```

### Legacy `experimentalDecorators` projects

TypeORM, NestJS and similar stacks require `experimentalDecorators`, which
switches the whole compilation to the old decorator signature. Every decorator
here detects that call form at runtime, so the same imports and the same
`@retry(3)` work in both worlds. Differences under `experimentalDecorators`:
`bind` binds on first access instead of at construction, `dispose` wires the
prototype, `readonly` and `lazy` decorate get/set accessors, and `periodic` is
unavailable because it needs a class initializer.

## Available Decorators

| Pattern         | Decorator                                            | Purpose                                                                    |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Retry           | [retry](docs/decorators/retry.md)                    | Retries a rejected async method with a fixed or computed delay             |
| Timeout         | [timeout](docs/decorators/timeout.md)                | Rejects slow async methods with a `DOMException` named `TimeoutError`      |
| Circuit breaker | [circuitBreaker](docs/decorators/circuit-breaker.md) | Fails fast after N consecutive failures, probes again after a cooldown     |
| Fallback        | [onError](docs/decorators/on-error.md)               | Routes thrown errors and rejections to a handler whose result is returned  |
| Hedging         | [multiDispatch](docs/decorators/multi-dispatch.md)   | Starts N identical async calls and resolves with the first success         |
| Rate limit      | [rateLimit](docs/decorators/rate-limit.md)           | Refuses calls above a count per sliding window, per instance or key        |
| Bulkhead        | [concurrent](docs/decorators/concurrent.md)          | Limits in-flight async calls per instance; extra calls queue in order      |
| Memoize         | [cache](docs/decorators/cache.md)                    | Caches results by arguments with an optional TTL; evicts rejected promises |
| Singleflight    | [delegate](docs/decorators/delegate.md)              | Shares one in-flight async call across callers with the same key           |
| Once            | [runOnce](docs/decorators/run-once.md)               | Runs once per instance and returns the first result to later calls         |
| Lazy            | [lazy](docs/decorators/lazy.md)                      | Computes a getter once per instance                                        |
| Debounce        | [debounce](docs/decorators/debounce.md)              | Coalesces rapid calls into one later execution                             |
| Throttle        | [throttle](docs/decorators/throttle.md)              | Runs at most once per window; calls in between are dropped                 |
| Latest wins     | [cancelPrevious](docs/decorators/cancel-previous.md) | Rejects the previous pending call with a `DOMException` named `AbortError` |
| Delay           | [delay](docs/decorators/delay.md)                    | Schedules the call after a fixed delay                                     |
| Periodic        | [periodic](docs/decorators/periodic.md)              | Calls the method on an interval until the instance is disposed             |
| Dispose         | [dispose](docs/decorators/dispose.md)                | Wires a method to `Symbol.dispose` / `Symbol.asyncDispose` for `using`     |
| Hooks           | [before](docs/decorators/before.md)                  | Runs a hook before the method                                              |
|                 | [after](docs/decorators/after.md)                    | Runs a hook after the method, optionally after the promise resolves        |
|                 | [execTime](docs/decorators/exec-time.md)             | Reports execution time via `performance.now()`                             |
| Binding         | [bind](docs/decorators/bind.md)                      | Binds a method to its instance during initialization                       |
|                 | [bindAll](docs/decorators/bind-all.md)               | Binds all methods declared on a class                                      |
| Readonly        | [readonly](docs/decorators/readonly.md)              | Makes an `accessor` write-protected                                        |

## Documentation

Start with [docs/README.md](docs/README.md) for the grouped reference; every
decorator has its own page under `docs/decorators/`.
