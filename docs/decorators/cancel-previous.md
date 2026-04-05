# cancelPrevious

Reject the previously returned promise when a new call starts. This is useful
for search, autocomplete, or any UI-driven workflow where only the latest
result matters.

## Import

```ts
import {
	CanceledPromise,
	cancelPrevious,
} from "decorator-toolkit/cancel-previous";
```

For legacy TypeScript decorators, import from `decorator-toolkit/cancel-previous/legacy`.

## Signature

```ts
cancelPrevious();

// Default behavior: @cancelPrevious or @cancelPrevious()
```

## Example

```ts
import {
	CanceledPromise,
	cancelPrevious,
} from "decorator-toolkit/cancel-previous";

class SearchService {
	@cancelPrevious
	async search(query: string): Promise<string> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return `results:${query}`;
	}
}

const service = new SearchService();
const first = service.search("app");
const second = service.search("apple");

first.catch((error) => {
	if (error instanceof CanceledPromise) {
		return;
	}

	throw error;
});

await second;
```

## Notes

- `cancelPrevious` is an async method decorator.
- Both `@cancelPrevious` and `@cancelPrevious()` use the default cancellation behavior.
- It rejects the promise returned by the previous call. It does not abort the
  underlying task automatically.
- The most recent call continues normally.

## Related

- [delegate](delegate.md)
- [throttleAsync](throttle-async.md)
- [timeout](timeout.md)
