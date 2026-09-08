# runOnce

Run a method once per instance and hand the first result to every later call,
whatever the arguments. Use it for lazy initialization such as opening a
connection.

## Import

```ts
import { runOnce } from "decorator-toolkit/run-once";
```

## Signature

```ts
runOnce();

// Default behavior: @runOnce or @runOnce()
```

## Example

```ts
import { runOnce } from "decorator-toolkit/run-once";

class Database {
	@runOnce
	async connect(): Promise<Connection> {
		return openConnection(); // runs once; concurrent callers share the promise
	}
}
```

## Notes

- `runOnce` is a method decorator; sync and async methods are supported.
- Arguments of later calls are ignored. Use [cache](cache.md) when the result
  depends on them.
- A throw or rejection resets the guard so the next call tries again.

## Related

- [cache](cache.md)
- [delegate](delegate.md)
- [lazy](lazy.md)
