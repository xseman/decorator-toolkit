# multiDispatch

Run the same async method several times in parallel and resolve with the first
successful result.

## Import

```ts
import { multiDispatch } from "decorator-toolkit/multi-dispatch";
```

For legacy TypeScript decorators, import from `decorator-toolkit/multi-dispatch/legacy` or import `{ multiDispatch }` from `decorator-toolkit/legacy`.

## Signature

```ts
multiDispatch(dispatchesAmount: number)
```

## Example

```ts
import { multiDispatch } from "decorator-toolkit/multi-dispatch";

class MirrorClient {
	private attempts = 0;

	@multiDispatch(3)
	async fetchStatus(): Promise<string> {
		this.attempts += 1;

		if (this.attempts < 3) {
			throw new Error("mirror unavailable");
		}

		return "ok";
	}
}
```

## Notes

- `multiDispatch` is an async method decorator.
- All dispatches receive the same arguments.
- If every dispatch fails, the decorator rejects with the last observed error.

## Related

- [retry](retry.md)
- [timeout](timeout.md)
