# timeout

Reject an async method when it takes longer than an allowed amount of time.

## Import

```ts
import {
	timeout,
	TimeoutError,
} from "decorator-toolkit/timeout";
```

For legacy TypeScript decorators, import from `decorator-toolkit/timeout/legacy`.

## Signature

```ts
timeout(ms: number)
```

## Example

```ts
import {
	timeout,
	TimeoutError,
} from "decorator-toolkit/timeout";

class ReportService {
	@timeout(250)
	async build(): Promise<string> {
		await new Promise((resolve) => setTimeout(resolve, 500));
		return "ready";
	}
}

const service = new ReportService();

try {
	await service.build();
} catch (error) {
	if (error instanceof TimeoutError) {
		console.error(error.message);
	}
}
```

## Notes

- `timeout` is an async method decorator.
- When the limit is exceeded, the returned promise rejects with `TimeoutError`.
- The internal timer is cleared when the method resolves or rejects.

## Related

- [cancelPrevious](cancel-previous.md)
- [retry](retry.md)
- [throttleAsync](throttle-async.md)
