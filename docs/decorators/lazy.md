# lazy

Compute a getter's value once and cache the result per instance. Subsequent
reads return the cached value without invoking the getter again.

## Import

```ts
import { lazy } from "decorator-toolkit/lazy";
```

## Signature

```ts
lazy();

// Default behavior: @lazy or @lazy()
```

## Example

```ts
import { lazy } from "decorator-toolkit/lazy";

class ReportBuilder {
	@lazy
	get schema(): object {
		return buildExpensiveSchema(); // runs once per instance
	}
}

const builder = new ReportBuilder();
console.info(builder.schema); // computed
console.info(builder.schema); // cached
```

## Notes

- `lazy` is a getter decorator. Apply it to a `get` accessor (not an `accessor` member).
- Both `@lazy` and `@lazy()` use the same behavior.
- The getter body is called at most once per instance; the result is cached for the lifetime of the instance.
- Falsy results (`null`, `0`, `""`, `false`) are cached correctly.
- Private getters are not supported.
- Works the same under legacy `experimentalDecorators`.

## Related

- [cache](cache.md)
- [runOnce](run-once.md)
