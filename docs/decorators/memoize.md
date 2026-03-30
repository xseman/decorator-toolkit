# memoize

Cache a method result by key so repeated calls reuse the stored value instead of
running the method again.

## Import

```ts
import { memoize } from "decorator-toolkit/memoize";
```

## Signature

```ts
memoize<This, Value, Args>(
	config?: number | {
		cache?: SyncCache<Value>;
		keyResolver?: keyof This | ((...args: Args) => string);
		expirationTimeMs?: number;
	},
)
```

## Example

```ts
import { memoize } from "decorator-toolkit/memoize";

class UserNames {
	cacheKey(id: string): string {
		return id;
	}

	@memoize<UserNames, string, [string]>({
		expirationTimeMs: 5_000,
		keyResolver: "cacheKey",
	})
	lookup(id: string): string {
		return `user:${id}:${Date.now()}`;
	}
}
```

## Notes

- `memoize` is a method decorator.
- Passing a number is shorthand for `expirationTimeMs`.
- By default, keys are derived from `JSON.stringify(args)` and caches are scoped
  per instance.
- Prefer [memoizeAsync](memoize-async.md) for async methods.

## Related

- [memoizeAsync](memoize-async.md)
- [delegate](delegate.md)
