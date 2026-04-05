# delegate

Share one in-flight async call across callers that resolve to the same key.
This avoids duplicated concurrent work for identical requests.

## Import

```ts
import { delegate } from "decorator-toolkit/delegate";
```

For legacy TypeScript decorators, import from `decorator-toolkit/delegate/legacy`.

## Signature

```ts
delegate<This, Args>(
	keyResolver?: keyof This | ((...args: Args) => string),
)

// Default behavior: @delegate or @delegate()
```

## Example

```ts
import { delegate } from "decorator-toolkit/delegate";

class UserDirectory {
	cacheKey(userId: string): string {
		return userId;
	}

	@delegate<UserDirectory, [string]>("cacheKey")
	async load(userId: string): Promise<{ id: string; }> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { id: userId };
	}
}
```

## Notes

- `delegate` is an async method decorator.
- With the default `JSON.stringify(args)` key strategy, both `@delegate` and
  `@delegate()` are supported.
- By default, the key is `JSON.stringify(args)`.
- Only concurrent matching calls are shared. Once the promise settles, a later
  call creates a new request.

## Related

- [cancelPrevious](cancel-previous.md)
- [cacheAsync](cache-async.md)
- [throttleAsync](throttle-async.md)
