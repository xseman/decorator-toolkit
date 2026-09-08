# legacy

Use the toolkit in a project that must keep `experimentalDecorators` enabled
(TypeORM, NestJS, older Lit or MobX setups). That flag switches the whole
compilation to the old decorator signature, so standard decorators cannot be
applied directly. `legacy` adapts any method decorator from this package.

## Import

```ts
import { legacy } from "decorator-toolkit/legacy";
```

## Signature

```ts
legacy(decorator: StandardMethodDecorator): MethodDecorator
```

## Example

```ts
import {
	cache,
	retry,
	timeout,
} from "decorator-toolkit";
import { legacy } from "decorator-toolkit/legacy";

class PricingRepository {
	@legacy(cache({ ttlMs: 5_000 }))
	@legacy(retry(3))
	@legacy(timeout(2_000))
	async price(sku: string): Promise<number> {
		return 1;
	}
}
```

## Notes

- Works with every decorator that wraps the method: `after`, `before`, `cache`,
  `cancelPrevious`, `circuitBreaker`, `concurrent`, `debounce`, `delay`,
  `delegate`, `execTime`, `multiDispatch`, `onError`, `rateLimit`, `retry`,
  `runOnce`, `throttle`, `timeout`.
- Not supported: `bind`, `dispose`, `periodic` (they need `addInitializer`,
  which legacy decorators do not have) and the accessor decorators `readonly`
  and `lazy`. Applying one throws at class definition time.
- Static methods are supported.
- Bare forms work too: `@legacy(cache)` and `@legacy(cache())` are equivalent.
