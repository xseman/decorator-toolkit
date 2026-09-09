# before

Run a hook before a decorated method executes. Use it for setup work,
instrumentation, or instance-local side effects that must happen first.

## Import

```ts
import { before } from "decorator-toolkit/before";
```

## Signature

```ts
before<This>(
	hook: keyof This | (() => unknown),
	options?: { wait?: boolean; },
)
```

## Example

```ts
import { before } from "decorator-toolkit/before";

class CacheWarmer {
	ready = false;

	async prepare(): Promise<void> {
		this.ready = true;
	}

	@before<CacheWarmer>("prepare", { wait: true })
	async getValue(): Promise<string> {
		return this.ready ? "warm" : "cold";
	}
}
```

## Notes

- `before` is a method decorator.
- `hook` is a function or the name of a method on the instance. It is called
  without arguments.
- `wait` defaults to `false`. Set it to `true` when the setup hook is async and
  must finish before the method starts.

## Related

- [after](after.md)
- [execTime](exec-time.md)
- [onError](on-error.md)
