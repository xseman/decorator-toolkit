# onError

Handle thrown errors and promise rejections in one place. The handler can return
a fallback value, start recovery work, or rethrow.

## Import

```ts
import { onError } from "decorator-toolkit/on-error";
```

## Signature

```ts
onError<This, Return, Args>(
	handler: keyof This | ((error: unknown, args: Args) => Return | Promise<Return>),
)
```

## Example

```ts
import { onError } from "decorator-toolkit/on-error";

class ProfileLoader {
	recover(_error: unknown, args: [string]): Promise<{ id: string; cached: true; }> {
		return Promise.resolve({ id: args[0], cached: true });
	}

	@onError<ProfileLoader, { id: string; cached: true; }, [string]>("recover")
	async load(id: string): Promise<{ id: string; cached: true; }> {
		throw new Error(`profile:${id}:failed`);
	}
}
```

## Notes

- `onError` is a method decorator.
- The handler receives the error and the original arguments.
- It handles both synchronous throws and async rejections.
- This is the fallback pattern: stack it above `retry`, `timeout`, `rateLimit`
  or `circuitBreaker` to turn their errors into a default value.

## Related

- [after](after.md)
- [before](before.md)
- [circuitBreaker](circuit-breaker.md)
- [retry](retry.md)
