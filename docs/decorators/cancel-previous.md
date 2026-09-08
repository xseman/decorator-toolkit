# cancelPrevious

Reject the previously returned promise when a new call starts. This is useful
for search, autocomplete, or any UI-driven workflow where only the latest
result matters.

## Import

```ts
import { cancelPrevious } from "decorator-toolkit/cancel-previous";
```

## Signature

```ts
cancelPrevious();

// Default behavior: @cancelPrevious or @cancelPrevious()
```

## Example

```ts
import { cancelPrevious } from "decorator-toolkit/cancel-previous";

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
	if (error.name === "AbortError") {
		return;
	}

	throw error;
});

await second;
```

## Notes

- `cancelPrevious` is an async method decorator.
- Both `@cancelPrevious` and `@cancelPrevious()` use the default cancellation behavior.
- The previous promise rejects with a `DOMException` named `"AbortError"`, the
  same error an aborted `fetch` produces. The underlying task is not aborted.
- The most recent call continues normally.

## Related

- [delegate](delegate.md)
- [concurrent](concurrent.md)
- [timeout](timeout.md)
