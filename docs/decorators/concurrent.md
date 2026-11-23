# concurrent

Bulkhead: run at most `limit` calls of an async method at once per instance.
Extra calls wait in a FIFO queue and start as slots free up. `@concurrent` with
no argument serializes calls one after another.

## Import

```ts
import { concurrent } from "decorator-toolkit/concurrent";
```

## Signature

```ts
concurrent(limit?: number) // default 1

// Default behavior: @concurrent or @concurrent()
```

## Example

```ts
import { concurrent } from "decorator-toolkit/concurrent";

class Uploader {
	@concurrent(3)
	async upload(file: File): Promise<void> {
		await fetch("/upload", { method: "POST", body: file });
	}

	@concurrent
	async writeLog(line: string): Promise<void> {
		// never interleaves with another writeLog on this instance
	}
}
```

## Notes

- `concurrent` is an async method decorator.
- `limit` must be a positive integer; anything else throws at decoration.
- Calls are never dropped; a rejection frees its slot and the queue continues.
- Use [throttle](throttle.md) or [rateLimit](rate-limit.md) when excess calls
  should be dropped or refused instead of queued.

## Related

- [rateLimit](rate-limit.md)
- [singleflight](singleflight.md)
- [throttle](throttle.md)
