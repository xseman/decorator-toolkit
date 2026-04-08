# Documentation

These pages document the current `decorator-toolkit` API. They are based on
the examples from the legacy `utils-decorators` site and cover both supported
decorator variants:

- standard decorators from `decorator-toolkit/<name>`
- legacy TypeScript decorators from `decorator-toolkit/<name>/legacy`
- named legacy imports from `decorator-toolkit/legacy`

`decorator-toolkit` does not include the old `*ify` function-wrapper helpers.
Use standard decorators by default. Reach for the `/legacy` subpath only when a
project still depends on TypeScript's legacy decorator transform.

## Reference

### Lifecycle and hooks

- [after](decorators/after.md)
- [before](decorators/before.md)
- [bind](decorators/bind.md)
- [dispose](decorators/dispose.md)
- [execTime](decorators/exec-time.md)
- [onError](decorators/on-error.md)

### Class decorators

- [bindAll](decorators/bind-all.md)

### Scheduling and flow control

- [cancelPrevious](decorators/cancel-previous.md)
- [debounce](decorators/debounce.md)
- [delay](decorators/delay.md)
- [multiDispatch](decorators/multi-dispatch.md)
- [retry](decorators/retry.md)
- [throttle](decorators/throttle.md)
- [throttleAsync](decorators/throttle-async.md)
- [timeout](decorators/timeout.md)

### Caching and request coordination

- [delegate](decorators/delegate.md)
- [cache](decorators/cache.md)
- [cacheAsync](decorators/cache-async.md)
- [rateLimit](decorators/rate-limit.md)

### Accessors

- [lazy](decorators/lazy.md)
- [readonly](decorators/readonly.md)
- [refreshable](decorators/refreshable.md)

## Notes

- Method decorators in this package apply to methods only.
- `bindAll` applies to classes.
- `readonly` and `refreshable` use TC39 `accessor` members by default; the
  `/legacy` variants decorate getter/setter accessors instead.
- `lazy` decorates `get` accessors (not `accessor` members); the `/legacy`
  variant decorates getter/setter accessors.
- `dispose` wires a method to `Symbol.dispose` (or `Symbol.asyncDispose` with
  `{ async: true }`). Use `using` / `await using` to trigger disposal.
- Private class members are not supported.
- Root imports and subpath imports are both supported. The examples in this
  directory prefer subpath imports so each page stays focused on one decorator.
- Default subpaths like `decorator-toolkit/cache` resolve to the TC39 variant.
  Legacy variants use `decorator-toolkit/cache/legacy` for a single decorator or
  named imports from `decorator-toolkit/legacy` when grouping several legacy
  decorators together.
