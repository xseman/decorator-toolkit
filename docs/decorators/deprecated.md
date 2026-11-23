# deprecated

Warn that a method is deprecated the first time it is called, then call it as
usual.

## Import

```ts
import { deprecated } from "decorator-toolkit/deprecated";
```

## Signature

```ts
deprecated(message?: string)

// Default behavior: @deprecated or @deprecated()
```

## Example

```ts
import { deprecated } from "decorator-toolkit/deprecated";

class UserDirectory {
	@deprecated("Use load() instead.")
	fetchUser(id: string): Promise<User> {
		return this.load(id);
	}

	async load(id: string): Promise<User> {
		// ...
	}
}

// first call logs: fetchUser() is deprecated. Use load() instead.
```

## Notes

- `deprecated` is a method decorator.
- The warning goes to `console.warn` once per decorated method, not once per
  instance.
- `message` is appended to the default `<name>() is deprecated.` notice.

## Related

- [before](before.md)
