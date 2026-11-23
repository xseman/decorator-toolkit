# batch

Merge calls made close together into one call. The decorated method takes an
array of items and returns one result per item; callers that arrive within the
same window are served by a single invocation and each gets back the results
for its own items.

## Import

```ts
import { batch } from "decorator-toolkit/batch";
```

## Signature

```ts
batch(windowMs?: number) // default 0

// Default behavior: @batch or @batch()
```

## Example

```ts
import { batch } from "decorator-toolkit/batch";

class UserDirectory {
	@batch
	async load(ids: string[]): Promise<User[]> {
		const response = await fetch(`/users?ids=${ids.join(",")}`);
		return response.json();
	}
}

const directory = new UserDirectory();

// one request for ["a", "b", "c"]
const [[alice], [bob, carol]] = await Promise.all([
	directory.load(["a"]),
	directory.load(["b", "c"]),
]);
```

## Notes

- `batch` is an async method decorator for methods shaped
  `(items: Item[]) => Promise<Result[]>`.
- The method must return exactly one result per item, in the same order. Any
  other result rejects every caller of that batch.
- With the default window of `0` all calls from the current event-loop tick are
  merged; a larger `windowMs` trades latency for bigger batches. The window
  starts at the first call.
- A rejection rejects every caller of that batch.
- Items are not deduplicated and batches have no size limit.
- Batches are collected per instance.
- `windowMs` must be a non-negative number; anything else throws at decoration.

## Related

- [cache](cache.md)
- [debounce](debounce.md)
- [singleflight](singleflight.md)
