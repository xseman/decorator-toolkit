# singleflight

Share one in-flight async call across callers that resolve to the same key.
This avoids duplicated concurrent work for identical requests.

## Import

```ts
import { singleflight } from "decorator-toolkit/singleflight";
```

## Signature

```ts
singleflight<This, Args>(
	keyResolver?: keyof This | ((...args: Args) => string),
)

// Default behavior: @singleflight or @singleflight()
```

## Example

```ts
import { singleflight } from "decorator-toolkit/singleflight";

class UserDirectory {
	cacheKey(userId: string): string {
		return userId;
	}

	@singleflight<UserDirectory, [string]>("cacheKey")
	async load(userId: string): Promise<{ id: string; }> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { id: userId };
	}
}
```

## Notes

- `singleflight` is an async method decorator.
- With the default key, both `@singleflight` and `@singleflight()` are supported.
- By default, a single non-string primitive argument (number, bigint, boolean,
  `null`, `undefined`) is the key itself; any other argument list is keyed by
  `JSON.stringify(args)`, so objects are compared by content, not identity.
  Values JSON cannot tell apart share a key: every `Map`, `Set` and function,
  and `undefined`, `null` and `NaN` among several arguments. A bigint inside
  an object or among several arguments throws. Pass a `keyResolver` for those.
- A method that throws synchronously produces a rejected promise, shared like any other.
- In-flight calls are tracked per instance; calls on different instances never
  share a promise.
- Only concurrent matching calls are shared. Once the promise settles, a later
  call creates a new request.

## Related

- [batch](batch.md)
- [cache](cache.md)
- [cancelPrevious](cancel-previous.md)
- [concurrent](concurrent.md)
