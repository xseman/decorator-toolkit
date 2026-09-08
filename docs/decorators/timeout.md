# timeout

Reject an async method when it takes longer than an allowed amount of time.

## Import

```ts
import { timeout } from "decorator-toolkit/timeout";
```

## Signature

```ts
timeout(ms: number)
```

## Example

```ts
import { timeout } from "decorator-toolkit/timeout";

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
	if (error.name === "TimeoutError") {
		console.error(error.message);
	}
}
```

## Notes

- `timeout` is an async method decorator.
- When the limit is exceeded, the returned promise rejects with a
  `DOMException` named `"TimeoutError"`, the same error `fetch` produces with
  `AbortSignal.timeout`, so one handler covers both.
- The internal timer is cleared when the method resolves or rejects.

## Related

- [cancelPrevious](cancel-previous.md)
- [circuitBreaker](circuit-breaker.md)
- [retry](retry.md)
