# Documentation

These pages document the current `decorator-toolkit` API. They are based on
the examples from the legacy `utils-decorators` site, but only the supported
decorator API is covered here.

`decorator-toolkit` does not include the old `*ify` function-wrapper helpers.
Use decorator syntax with TypeScript 5+ standard decorators.

## Reference

### Lifecycle and hooks

- [after](decorators/after.md)
- [before](decorators/before.md)
- [bind](decorators/bind.md)
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

- [readonly](decorators/readonly.md)
- [refreshable](decorators/refreshable.md)

## Notes

- Method decorators in this package apply to methods only.
- `bindAll` applies to classes.
- `readonly` and `refreshable` apply to `accessor` members only.
- Private class members are not supported.
- Root imports and subpath imports are both supported. The examples in this
  directory prefer subpath imports so each page stays focused on one decorator.
