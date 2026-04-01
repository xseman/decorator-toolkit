# throttleAsync

Queue async method calls and run only a bounded number at the same time. This is
useful when a downstream service can only handle limited parallelism.

## Import

```ts
import { throttleAsync } from "decorator-toolkit/throttle-async";
```

## Signature

```ts
throttleAsync(parallelCalls?: number)

// Default behavior: @throttleAsync or @throttleAsync()
```

## Example

```ts
import { throttleAsync } from "decorator-toolkit/throttle-async";

class ExportQueue {
	@throttleAsync(2)
	async generate(name: string): Promise<string> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return `done:${name}`;
	}
}
```

## Notes

- `throttleAsync` is an async method decorator.
- With the default concurrency of `1`, both `@throttleAsync` and
  `@throttleAsync()` are supported.
- `parallelCalls` defaults to `1`.
- Extra calls are queued and start when earlier calls settle.
- Execution state is tracked per instance.

## Related

- [cancelPrevious](cancel-previous.md)
- [delegate](delegate.md)
- [throttle](throttle.md)
