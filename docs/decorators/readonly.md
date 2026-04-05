# readonly

Turn an `accessor` member into a read-only value. Reads still work normally,
but every write throws a `TypeError`.

## Import

```ts
import { readonly } from "decorator-toolkit/readonly";
```

For legacy TypeScript decorators, import from `decorator-toolkit/readonly/legacy`.

## Signature

```ts
readonly();

// Default behavior: @readonly or @readonly()
```

## Example

```ts
import { readonly } from "decorator-toolkit/readonly";

class SessionStore {
	@readonly
	accessor id = crypto.randomUUID();
}

const store = new SessionStore();
console.info(store.id);
store.id = "next-id";
```

## Notes

- `readonly` is an accessor decorator.
- Both `@readonly` and `@readonly()` use the default read-only behavior.
- Use the `accessor` keyword for the default TC39 variant. The legacy variant
  decorates getter/setter accessors instead.
- The thrown error includes the decorated property name.

## Related

- [refreshable](refreshable.md)
