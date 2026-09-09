# Documentation

These pages document the `decorator-toolkit` API: standard TC39 decorators for
TypeScript 5+, importable from the root package or from
`decorator-toolkit/<name>`.

## Reference

### Resilience

- [circuitBreaker](decorators/circuit-breaker.md)
- [onError](decorators/on-error.md)
- [retry](decorators/retry.md)
- [timeout](decorators/timeout.md)
- [multiDispatch](decorators/multi-dispatch.md)

### Concurrency and flow control

- [cancelPrevious](decorators/cancel-previous.md)
- [concurrent](decorators/concurrent.md)
- [debounce](decorators/debounce.md)
- [delay](decorators/delay.md)
- [rateLimit](decorators/rate-limit.md)
- [throttle](decorators/throttle.md)

### Caching and deduplication

- [cache](decorators/cache.md)
- [delegate](decorators/delegate.md)
- [lazy](decorators/lazy.md)
- [runOnce](decorators/run-once.md)

### Lifecycle and hooks

- [after](decorators/after.md)
- [before](decorators/before.md)
- [bind](decorators/bind.md)
- [bindAll](decorators/bind-all.md)
- [dispose](decorators/dispose.md)
- [execTime](decorators/exec-time.md)
- [periodic](decorators/periodic.md)

### Accessors

- [readonly](decorators/readonly.md)

## Notes

- Method decorators apply to methods only; `bindAll` applies to classes;
  `readonly` decorates `accessor` members; `lazy` decorates `get` accessors.
- Private class members are not supported.
- Decorators that need no configuration accept both `@decorator` and
  `@decorator()`.
- `timeout` and `cancelPrevious` reject with the platform `DOMException`
  (`"TimeoutError"` / `"AbortError"`), the same errors `fetch` produces.
- `dispose` and `periodic` use `Symbol.dispose`; trigger them with `using`.
- Every decorator also accepts the legacy `experimentalDecorators` call form
  (TypeORM, NestJS), with the same imports. Exceptions: `periodic` needs a class
  initializer and is unavailable there; `readonly` and `lazy` then decorate
  get/set accessors; `bind` binds on first access; `dispose` wires the prototype.
