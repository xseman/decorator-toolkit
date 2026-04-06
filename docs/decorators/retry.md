# retry

Retry an async method with fixed delays or a per-attempt delay array. This is
useful when failures are transient and a second attempt often succeeds.

## Import

```ts
import { retry } from "decorator-toolkit/retry";
```

For legacy TypeScript decorators, import from `decorator-toolkit/retry/legacy` or import `{ retry }` from `decorator-toolkit/legacy`.

## Signature

```ts
retry<This>(
	input:
		| number
		| number[]
		| {
			retries?: number;
			delay?: number;
			delaysArray?: number[];
			onRetry?: keyof This | ((error: unknown, retriesCount: number) => void);
		},
)
```

## Example

```ts
import { retry } from "decorator-toolkit/retry";

class PaymentsApi {
	logRetry(error: unknown, retriesCount: number): void {
		console.warn("retry", retriesCount, error);
	}

	@retry<PaymentsApi>({
		retries: 3,
		delay: 250,
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
- Passing an array uses one delay value per retry.
- You cannot provide both `retries` and `delaysArray` in the object form.

## Related

- [multiDispatch](multi-dispatch.md)
- [onError](on-error.md)
- [timeout](timeout.md)
