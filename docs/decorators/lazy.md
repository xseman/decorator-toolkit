# lazy

Compute a getter's value once and cache the result per instance. Subsequent
reads return the cached value without invoking the getter again.

## Import

```ts
import { lazy } from "decorator-toolkit/lazy";
```

For legacy TypeScript decorators, import from `decorator-toolkit/lazy/legacy` or import `{ lazy }` from `decorator-toolkit/legacy`.

## Signature

```ts
lazy()

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
- The legacy variant decorates getter/setter accessors instead and `WeakMap`-keys on the instance, falling back gracefully if the instance is not a valid `WeakMap` key.
- Private getters are not supported.

## Related

- [cache](cache.md)
- [readonly](readonly.md)
