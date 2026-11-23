# dispose

Mark a method as the disposal handler for a class. When the instance is
released via a `using` or `await using` declaration, the decorated method is
called automatically through `Symbol.dispose` or `Symbol.asyncDispose`.

## Import

```ts
import { dispose } from "decorator-toolkit/dispose";
```

## Signature

```ts
dispose(config?: {
	async?: boolean;
})

// Default behavior: @dispose or @dispose()
```

## Example

```ts
import { dispose } from "decorator-toolkit/dispose";

class DatabaseConnection {
	declare [Symbol.dispose]: () => void;

	@dispose
	close(): void {
		// called when the instance leaves the `using` block
	}
}

{
	using conn = new DatabaseConnection();
	// use conn...
} // conn.close() is called here
```

### Async disposal

```ts
import { dispose } from "decorator-toolkit/dispose";

class ConnectionPool {
	declare [Symbol.asyncDispose]: () => Promise<void>;

	@dispose({ async: true })
	async drain(): Promise<void> {
		// called when the instance leaves the `await using` block
	}
}

{
	await using pool = new ConnectionPool();
	// use pool...
} // await pool.drain() is called here
```

### Composing multiple disposal methods

Multiple `@dispose` decorators on the same class all run during disposal in
reverse declaration order (LIFO), like stacked `using` declarations and
`DisposableStack`, so what was set up last is torn down first:

```ts
class Service {
	declare [Symbol.dispose]: () => void;

	@dispose
	closeCache(): void {/* ... */}

	@dispose
	closeDatabase(): void {/* ... */}
}

// on disposal: closeDatabase() then closeCache()
```

## Notes

- `dispose` is a method decorator.
- `@dispose` and `@dispose()` both wire `Symbol.dispose` (sync).
- Pass `{ async: true }` to wire `Symbol.asyncDispose` instead; use `await using` with such instances.
- Multiple `@dispose` methods on one class compose: all decorated methods are called during disposal,
  even when one of them throws. If several throw, the error of the earliest declared disposer that threw propagates.
- The decorator wires the symbol at run time, so the type does not carry it. Declare
  `declare [Symbol.dispose]: () => void` (or the async variant) on the class to use it
  with `using`. `declare` is type-only and emits nothing.
- Each decorated method runs at most once per instance through the dispose symbols; disposing again is a no-op.
- The decorated method remains callable directly in addition to being wired to the dispose symbol.
- Private methods are not supported.
- Under legacy `experimentalDecorators` the disposer is wired on the prototype
  instead of on each instance.
- Requires TypeScript 5.2+ and a runtime with `Symbol.dispose` / `Symbol.asyncDispose` (Node 22+, Bun, current browsers).
- A class may mix sync and `{ async: true }` disposers: `await using` runs all of them as one stack in
  reverse declaration order, `using` runs only the sync ones.
- [periodic](periodic.md) registers its own disposer the same way, so `using` and `await using` also stop timers.

## Related

- [periodic](periodic.md)
