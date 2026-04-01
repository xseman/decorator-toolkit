<h1 align="center">decorator-toolkit</h1>

<p align="center">
	Modern TC39 decorators for reducing repetitive code in TypeScript.
</p>

<p align="center">
	<a href="#features">Features</a> •
	<a href="#installation">Installation</a> •
	<a href="#documentation">Documentation</a> •
	<a href="#usage">Usage</a> •
	<a href="#available-decorators">Available Decorators</a>
</p>

## Features

- Built for modern TC39 decorators in TypeScript 5+
- Covers sync and async method workflows
- Includes memoization, retry, timeout, debounce, throttling, delegation, and rate limiting

## Installation

### npm

```sh
$ npm install decorator-toolkit
```

### Bun

```sh
$ bun add decorator-toolkit
```

## Usage

This package targets the standard TC39 decorator model. It is intended for
TypeScript 5+ projects using standard decorators rather than legacy
`experimentalDecorators` semantics.

### Compiler Setup

At minimum, use a modern TypeScript configuration that emits native class
features and supports standard decorators:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "Node16",
		"moduleResolution": "Node16"
	}
}
```

> [!NOTE]
> Method decorators in this package apply to methods only, `bindAll` applies to
> classes, and accessor decorators apply to `accessor` members only. Private
> members are not supported.

> [!TIP]
> Decorators that use default behavior can be written as `@decorator` or
> `@decorator()`. This applies to `bind`, `bindAll`, `cancelPrevious`,
> `delegate`, `execTime`, `memoize`, `memoizeAsync`, `readonly`, and
> `throttleAsync`.

### Basic Example

```ts
import {
	after,
	before,
	retry,
	timeout,
} from "decorator-toolkit";

class PaymentService {
	private readonly events: string[] = [];

	beforeSave(): void {
		this.events.push("before");
	}

	afterSave(params: { args: [string]; response: string; }): void {
		this.events.push(`after:${params.args[0]}:${params.response}`);
	}

	@before<PaymentService>({ func: "beforeSave" })
	@after<PaymentService, string, [string]>({ func: "afterSave", wait: true })
	@retry(3)
	@timeout(1_000)
	async save(id: string): Promise<string> {
		return `saved:${id}`;
	}
}
```

### Memoization And Rate Limiting

```ts
import {
	memoize,
	rateLimit,
} from "decorator-toolkit";

class DirectoryService {
	@memoize({ expirationTimeMs: 5_000 })
	lookupUser(id: string): { id: string; name: string; } {
		return { id, name: `user:${id}` };
	}

	@rateLimit<DirectoryService, [string]>({
		allowedCalls: 10,
		timeSpanMs: 60_000,
		keyResolver: (userId) => userId,
	})
	openProfile(userId: string): string {
		return `/users/${userId}`;
	}
}
```

### Accessor Decorators

`readonly` and `refreshable` are accessor decorators, so they must decorate
`accessor` members.

```ts
import {
	readonly,
	refreshable,
} from "decorator-toolkit";

class SessionStore {
	@readonly
	accessor id = crypto.randomUUID();

	@refreshable<SessionStore, number>({
		dataProvider: "loadCounter",
		intervalMs: 5_000,
	})
	accessor counter: number | null = 0;

	async loadCounter(): Promise<number> {
		return Date.now();
	}
}

const store = new SessionStore();
store.counter = null;
```

Assigning `null` to a `refreshable` accessor stops future refresh cycles for
that accessor.

### Root And Subpath Imports

You can import from the root package:

```ts
import {
	delegate,
	timeout,
} from "decorator-toolkit";
```

Or import specific modules via subpaths:

```ts
import { memoize } from "decorator-toolkit/memoize";
import {
	timeout,
	TimeoutError,
} from "decorator-toolkit/timeout";
```

## Documentation

Start with [docs/README.md](docs/README.md) for grouped references and usage
patterns. The decorator list below links to dedicated pages with current TC39
examples adapted from the legacy site.

## Available Decorators

| Decorator                                            | Purpose                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| [after](docs/decorators/after.md)                    | Runs a hook after a method call, optionally waiting for async resolution |
| [before](docs/decorators/before.md)                  | Runs a hook before a method call, optionally waiting for async hooks     |
| [bind](docs/decorators/bind.md)                      | Binds a method to its instance or class during initialization            |
| [bindAll](docs/decorators/bind-all.md)               | Binds all public instance methods declared on a class                    |
| [cancelPrevious](docs/decorators/cancel-previous.md) | Rejects the previous pending async invocation with `CanceledPromise`     |
| [debounce](docs/decorators/debounce.md)              | Coalesces rapid method calls into a later single execution               |
| [delegate](docs/decorators/delegate.md)              | Shares one in-flight async invocation across callers with the same key   |
| [delay](docs/decorators/delay.md)                    | Schedules method execution after a fixed delay                           |
| [execTime](docs/decorators/exec-time.md)             | Reports method execution duration                                        |
| [memoize](docs/decorators/memoize.md)                | Caches synchronous method results                                        |
| [memoizeAsync](docs/decorators/memoize-async.md)     | Caches async results and deduplicates pending async calls                |
| [multiDispatch](docs/decorators/multi-dispatch.md)   | Starts multiple async attempts and resolves on the first success         |
| [onError](docs/decorators/on-error.md)               | Forwards thrown or rejected errors to a handler                          |
| [rateLimit](docs/decorators/rate-limit.md)           | Limits how many calls may happen within a configured time window         |
| [readonly](docs/decorators/readonly.md)              | Makes an accessor write-protected                                        |
| [refreshable](docs/decorators/refreshable.md)        | Refreshes an accessor from an async data provider on an interval         |
| [retry](docs/decorators/retry.md)                    | Retries async methods using a fixed or custom delay strategy             |
| [throttle](docs/decorators/throttle.md)              | Limits how often a method can run                                        |
| [throttleAsync](docs/decorators/throttle-async.md)   | Queues async calls and executes them with bounded concurrency            |
| [timeout](docs/decorators/timeout.md)                | Rejects slow async methods with `TimeoutError`                           |
