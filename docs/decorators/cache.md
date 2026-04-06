# cache

Cache a method result by key so repeated calls reuse the stored value instead of
running the method again.

## Import

```ts
import { cache } from "decorator-toolkit/cache";
```

For legacy TypeScript decorators, import from `decorator-toolkit/cache/legacy` or import `{ cache }` from `decorator-toolkit/legacy`.

## Signature

```ts
cache<This, Value, Args>(
	config?: number | {
		store?: CacheStore<Value>;
		keyResolver?: keyof This | ((...args: Args) => string);
		ttlMs?: number;
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

	@cache<UserNames, string, [string]>({
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
- Prefer [cacheAsync](cache-async.md) for async methods.

## Related

- [cacheAsync](cache-async.md)
- [delegate](delegate.md)
