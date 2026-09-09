# cache

Memoize a method per instance, keyed by its arguments. Works for async methods
too: the promise itself is cached, so concurrent calls share one request, and a
rejected promise is evicted so the next call retries.

## Import

```ts
import { cache } from "decorator-toolkit/cache";
```

## Signature

```ts
cache<This, Args>(
	config?: number | {
		ttlMs?: number;
		keyResolver?: keyof This | ((...args: Args) => string);
	},
)

// Default behavior: @cache or @cache()
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

## Notes

- `cache` is a method decorator.
- With the default settings, both `@cache` and `@cache()` are supported.
- Passing a number is shorthand for `ttlMs`.
- By default, keys are derived from `JSON.stringify(args)` and stores are scoped
  per instance.
- Entries expire lazily: `ttlMs` is checked on read, no timers are kept.
- For an argument-independent "run once" guard use [runOnce](run-once.md).

## Related

- [delegate](delegate.md)
- [lazy](lazy.md)
- [runOnce](run-once.md)
