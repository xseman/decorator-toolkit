# cache

Memoize a method per instance, keyed by its arguments. Works for async methods
too: the promise itself is cached, so concurrent calls share one request, and a
rejected promise is evicted so the next call retries. `clearCache` drops what
was cached.

## Import

```ts
import {
	cache,
	clearCache,
} from "decorator-toolkit/cache";
```

## Signature

```ts
cache<This, Args>(
	config?: number | {
		ttlMs?: number;
		max?: number;
		keyResolver?: keyof This | ((...args: Args) => string);
	},
)

// Default behavior: @cache or @cache()

clearCache(instance: object, method?: string | symbol)
```

## Example

```ts
import { cache } from "decorator-toolkit/cache";

class UserNames {
	cacheKey(id: string): string {
		return id;
	}

	@cache<UserNames, [string]>({
		ttlMs: 5_000,
		keyResolver: "cacheKey",
	})
	lookup(id: string): string {
		return `user:${id}:${Date.now()}`;
	}
}
```

### Bounded cache and invalidation

```ts
import {
	cache,
	clearCache,
} from "decorator-toolkit/cache";

class Reports {
	@cache({ max: 1 }) // remembers the last filter only
	async summary(filter: { year: number; }): Promise<number> {
		const response = await fetch(`/reports/summary?year=${filter.year}`);
		return response.json();
	}

	@cache
	async years(): Promise<number[]> {
		const response = await fetch("/reports/years");
		return response.json();
	}

	async save(report: object): Promise<void> {
		await fetch("/reports", { method: "POST", body: JSON.stringify(report) });
		clearCache(this); // or clearCache(this, "summary") for one method
	}
}
```

## Notes

- `cache` is a method decorator.
- With the default settings, both `@cache` and `@cache()` are supported.
- Passing a number is shorthand for `ttlMs`.
- By default, a single non-string primitive argument (number, bigint, boolean,
  `null`, `undefined`) is the key itself; any other argument list is keyed by
  `JSON.stringify(args)`, so objects are compared by content, not identity.
  Values JSON cannot tell apart share a key: every `Map`, `Set` and function,
  and `undefined`, `null` and `NaN` among several arguments. A bigint inside
  an object or among several arguments throws. Pass a `keyResolver` for those.
- Stores are scoped per instance.
- Entries expire lazily: `ttlMs` is checked on read, no timers are kept.
- For async methods the TTL starts when the promise resolves, so a call that is
  still in flight is always shared.
- `max` keeps at most that many keys per instance and evicts the least recently
  used one; `max: 1` remembers only the last key. It must be a positive integer.
- `clearCache(instance)` drops every `@cache` store of that instance,
  `clearCache(instance, "method")` only that method's; pass the class for static
  methods. The method name is not checked, so a name that matches nothing does
  nothing. A call still in flight keeps its promise for the callers that hold
  it, but is not stored again.
- For an argument-independent "run once" guard use [runOnce](run-once.md).

## Related

- [lazy](lazy.md)
- [runOnce](run-once.md)
- [singleflight](singleflight.md)
