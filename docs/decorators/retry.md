# retry

Retry an async method with a fixed or computed delay. This is useful when
failures are transient and a second attempt often succeeds.

## Import

```ts
import { retry } from "decorator-toolkit/retry";
```

## Signature

```ts
retry<This>(
	input:
		| number
		| {
			retries: number;
			delay?: number | ((attempt: number, error: unknown) => number);
			shouldRetry?: (error: unknown) => boolean;
			onRetry?: keyof This | ((error: unknown, attempt: number) => void);
		},
)
```

## Example

```ts
import { retry } from "decorator-toolkit/retry";

class PaymentsApi {
	logRetry(error: unknown, attempt: number): void {
		console.warn("retry", attempt, error);
	}

	@retry<PaymentsApi>({
		retries: 3,
		delay: (attempt) => 250 * 2 ** (attempt - 1), // 250, 500, 1000
		shouldRetry: (error) => !(error instanceof TypeError),
		onRetry: "logRetry",
	})
	async capture(): Promise<string> {
		return fetch("https://example.test/payments", {
			method: "POST",
		}).then((response) => response.text());
	}
}
```

## Notes

- `retry` is an async method decorator.
- Passing a number means that many retries with the default 1000 ms delay.
- `attempt` is 1-based: the number of the attempt that just failed. A `delay`
  function covers exponential backoff and jitter.
- `shouldRetry` returning `false` rethrows immediately.

## Related

- [circuitBreaker](circuit-breaker.md)
- [multiDispatch](multi-dispatch.md)
- [onError](on-error.md)
- [timeout](timeout.md)
