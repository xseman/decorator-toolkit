# rateLimit

Limit how many calls may run within a time window. You can group calls by a
custom key so each user, tenant, or route gets its own quota bucket.

## Import

```ts
import {
	rateLimit,
	SimpleRateLimitCounter,
} from "decorator-toolkit/rate-limit";
```

For legacy TypeScript decorators, import from `decorator-toolkit/rate-limit/legacy` or import `{ rateLimit }` from `decorator-toolkit/legacy`.

## Signature

```ts
rateLimit<This, Args>({
	allowedCalls: number;
	timeSpanMs: number;
	keyResolver?: keyof This | ((...args: Args) => string);
	rateLimitCounter?: RateLimitCounter;
	rateLimitAsyncCounter?: RateLimitAsyncCounter;
	exceedHandler?: () => void;
})
```

## Example

```ts
import {
	rateLimit,
	SimpleRateLimitCounter,
} from "decorator-toolkit/rate-limit";

class ProfileApi {
	readonly counter = new SimpleRateLimitCounter();

	@rateLimit<ProfileApi, [string]>({
		allowedCalls: 5,
		timeSpanMs: 60_000,
		keyResolver: (userId) => userId,
		rateLimitCounter: new SimpleRateLimitCounter(),
	})
	load(userId: string): string {
		return `/profiles/${userId}`;
	}
}
```

## Notes

- `rateLimit` is a method decorator.
- If you omit `keyResolver`, all calls share the same default bucket.
- Provide either `rateLimitCounter` or `rateLimitAsyncCounter`, not both.
- The default `exceedHandler` throws an error when the quota is exceeded.

## Related

- [delegate](delegate.md)
- [throttle](throttle.md)
- [throttleAsync](throttle-async.md)
