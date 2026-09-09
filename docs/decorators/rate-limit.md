# rateLimit

Limit how many calls may run within a time window. You can group calls by a
custom key so each user, tenant, or route gets its own quota bucket.

## Import

```ts
import { rateLimit } from "decorator-toolkit/rate-limit";
```

## Signature

```ts
rateLimit<This, Args>({
	allowedCalls: number;
	timeSpanMs: number;
	keyResolver?: keyof This | ((...args: Args) => string);
})
```

## Example

```ts
import { rateLimit } from "decorator-toolkit/rate-limit";

class ProfileApi {
	@rateLimit<ProfileApi, [string]>({
		allowedCalls: 5,
		timeSpanMs: 60_000,
		keyResolver: (userId) => userId,
	})
	load(userId: string): string {
		return `/profiles/${userId}`;
	}
}
```

## Notes

- `rateLimit` is a method decorator.
- The window is sliding and tracked per instance; `keyResolver` splits it
  further per key.
- Above the limit the call throws (or rejects, once the method is known to be
  async) with `Error("Rate limit exceeded: …")`. Stack [onError](on-error.md)
  above it for a fallback value.

## Related

- [circuitBreaker](circuit-breaker.md)
- [concurrent](concurrent.md)
- [throttle](throttle.md)
