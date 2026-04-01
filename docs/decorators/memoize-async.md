# memoizeAsync

Cache async results and deduplicate identical in-flight calls. When the same key
is requested concurrently, callers receive the same promise.

## Import

```ts
import { memoizeAsync } from "decorator-toolkit/memoize-async";
```

## Signature

```ts
memoizeAsync<This, Value, Args>(
	config?: number | {
		cache?: SyncCache<Value> | AsyncCache<Value>;
		keyResolver?: keyof This | ((...args: Args) => string);
		expirationTimeMs?: number;
	},
)

// Default behavior: @memoizeAsync or @memoizeAsync()
```

## Example

```ts
import { memoizeAsync } from "decorator-toolkit/memoize-async";

class UserProfiles {
	keyFor(id: string): string {
		return id;
	}

	@memoizeAsync<UserProfiles, { id: string; }, [string]>({
		expirationTimeMs: 10_000,
		keyResolver: "keyFor",
	})
	async load(id: string): Promise<{ id: string; }> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { id };
	}
}
```

## Notes

- `memoizeAsync` is an async method decorator.
- With the default cache settings, both `@memoizeAsync` and
  `@memoizeAsync()` are supported.
- Passing a number is shorthand for `expirationTimeMs`.
- Rejected calls are not persisted in the cache.
- By default, keys are derived from `JSON.stringify(args)` and caches are scoped
  per instance.

## Related

- [memoize](memoize.md)
- [delegate](delegate.md)
- [cancelPrevious](cancel-previous.md)
