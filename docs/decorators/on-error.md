# onError

Handle thrown errors and promise rejections in one place. The handler can return
a fallback value, start recovery work, or rethrow.

## Import

```ts
import { onError } from "decorator-toolkit/on-error";
```

## Signature

```ts
onError<This, Return, Args>({
	func: keyof This | ((error: unknown, args: Args) => Return | Promise<Return>),
})
```

## Example

```ts
import { onError } from "decorator-toolkit/on-error";

class ProfileLoader {
	recover(_error: unknown, args: [string]): Promise<{ id: string; cached: true; }> {
		return Promise.resolve({ id: args[0], cached: true });
	}

	@onError<ProfileLoader, { id: string; cached: true; }, [string]>({
		func: "recover",
	})
	async load(id: string): Promise<{ id: string; cached: true; }> {
		throw new Error(`profile:${id}:failed`);
	}
}
```

## Notes

- `onError` is a method decorator.
- The handler receives the error and the original arguments.
- It handles both synchronous throws and async rejections.

## Related

- [after](after.md)
- [before](before.md)
- [retry](retry.md)
