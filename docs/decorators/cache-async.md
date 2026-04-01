# cacheAsync

Cache async results and deduplicate identical in-flight calls. When the same key
is requested concurrently, callers receive the same promise.

## Import

```ts
import { cacheAsync } from "decorator-toolkit/cache-async";
```

## Signature

```ts
cacheAsync<This, Value, Args>(
	config?: number | {
		store?: CacheStore<Value> | AsyncCacheStore<Value>;
		keyResolver?: keyof This | ((...args: Args) => string);
		ttlMs?: number;
	},
)

// Default behavior: @cacheAsync or @cacheAsync()
```

## Example

```ts
import { cacheAsync } from "decorator-toolkit/cache-async";

class UserProfiles {
	keyFor(id: string): string {
		return id;
	}

	@cacheAsync<UserProfiles, { id: string; }, [string]>({
		ttlMs: 10_000,
		keyResolver: "keyFor",
	})
	async load(id: string): Promise<{ id: string; }> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { id };
	}
}
```

## Notes

- `cacheAsync` is an async method decorator.
- With the default settings, both `@cacheAsync` and `@cacheAsync()` are
  supported.
- Passing a number is shorthand for `ttlMs`.
- Rejected calls are not persisted in the cache.
- By default, keys are derived from `JSON.stringify(args)` and stores are scoped
  per instance.

## Related

- [cache](cache.md)
- [delegate](delegate.md)
- [cancelPrevious](cancel-previous.md)
