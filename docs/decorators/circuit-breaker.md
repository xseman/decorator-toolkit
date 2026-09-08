# circuitBreaker

Stop calling a failing dependency. After `failures` consecutive failures the
circuit opens and calls fail fast with `CircuitOpenError` instead of hitting the
dependency. After `resetMs` a single probe call is let through: success closes
the circuit, failure re-opens it.

## Import

```ts
import {
	circuitBreaker,
	CircuitOpenError,
} from "decorator-toolkit/circuit-breaker";
```

## Signature

```ts
circuitBreaker({
	failures: number;
	resetMs: number;
})
```

## Example

```ts
import { circuitBreaker } from "decorator-toolkit/circuit-breaker";
import { onError } from "decorator-toolkit/on-error";
import { timeout } from "decorator-toolkit/timeout";

class PricingClient {
	@onError<PricingClient, number, [string]>(() => 0) // fallback while open
	@circuitBreaker({ failures: 5, resetMs: 30_000 })
	@timeout(2_000)
	async price(sku: string): Promise<number> {
		const response = await fetch(`https://pricing.example/${sku}`);
		return Number(await response.text());
	}
}
```

## Notes

- `circuitBreaker` is a method decorator; sync and async methods are supported.
- State is per instance. Any success closes the circuit and resets the failure
  count; the count only grows on consecutive failures.
- While open, the method is not called. The error's `cause` is the last error
  the dependency produced.
- Half-open admits exactly one probe; other calls keep failing fast until it
  settles.
- Combine with [retry](retry.md) (inside) and [onError](on-error.md) (outside)
  for the usual retry → breaker → fallback pipeline.

## Related

- [onError](on-error.md)
- [rateLimit](rate-limit.md)
- [retry](retry.md)
- [timeout](timeout.md)
