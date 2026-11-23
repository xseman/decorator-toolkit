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

### Concurrency and flow control

- [cancelPrevious](decorators/cancel-previous.md)
- [concurrent](decorators/concurrent.md)
- [debounce](decorators/debounce.md)
- [rateLimit](decorators/rate-limit.md)
- [throttle](decorators/throttle.md)

### Caching and deduplication

- [batch](decorators/batch.md)
- [cache](decorators/cache.md)
- [lazy](decorators/lazy.md)
- [runOnce](decorators/run-once.md)
- [singleflight](decorators/singleflight.md)

### Lifecycle and hooks

- [after](decorators/after.md)
- [before](decorators/before.md)
- [bind](decorators/bind.md)
- [bindAll](decorators/bind-all.md)
- [deprecated](decorators/deprecated.md)
- [dispose](decorators/dispose.md)
- [execTime](decorators/exec-time.md)
- [periodic](decorators/periodic.md)

## Notes

- Method decorators apply to methods only; `bindAll` applies to classes;
  `lazy` decorates `get` accessors.
- Private class members are not supported.
- Decorators that need no configuration accept both `@decorator` and
  `@decorator()`.
- `timeout` and `cancelPrevious` reject with the platform `DOMException`
  (`"TimeoutError"` / `"AbortError"`), the same errors `fetch` produces.
- `dispose` and `periodic` use `Symbol.dispose`; trigger them with `using`.
- Every decorator also accepts the legacy `experimentalDecorators` call form
  (TypeORM, NestJS), with the same imports. Exceptions: `periodic` needs a class
  initializer and is unavailable there; `bind` binds on first access; `dispose`
  wires the prototype.
