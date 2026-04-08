# dispose

Mark a method as the disposal handler for a class. When the instance is
released via a `using` or `await using` declaration, the decorated method is
called automatically through `Symbol.dispose` or `Symbol.asyncDispose`.

## Import

```ts
import { dispose } from "decorator-toolkit/dispose";
```

For legacy TypeScript decorators, import from `decorator-toolkit/dispose/legacy` or import `{ dispose }` from `decorator-toolkit/legacy`.

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

Multiple `@dispose` decorators on the same class all run during disposal in the
order they were declared (FIFO):

```ts
class Service {
	@dispose
	closeCache(): void {/* ... */}

	@dispose
	closeDatabase(): void {/* ... */}
}

// on disposal: closeCache() then closeDatabase()
```

## Notes

- `dispose` is a method decorator.
- `@dispose` and `@dispose()` both wire `Symbol.dispose` (sync).
- Pass `{ async: true }` to wire `Symbol.asyncDispose` instead; use `await using` with such instances.
- Multiple `@dispose` methods on one class compose: all decorated methods are called during disposal.
- The decorated method remains callable directly in addition to being wired to the dispose symbol.
- Private methods are not supported.
- Requires TypeScript 5.2+ and a runtime that supports `Symbol.dispose` / `Symbol.asyncDispose` (Node.js ≥ 18.18, Bun ≥ 1.0).

## Related

- [onError](on-error.md)
- [after](after.md)
