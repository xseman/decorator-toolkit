# throttle

Run the first call immediately, then ignore new calls until the throttle window
expires.

## Import

```ts
import { throttle } from "decorator-toolkit/throttle";
```

## Signature

```ts
throttle(delayMs: number)
```

## Example

```ts
import { throttle } from "decorator-toolkit/throttle";

class ScrollTracker {
	readonly events: number[] = [];

	@throttle(200)
	record(position: number): void {
		this.events.push(position);
	}
}
```

## Notes

- `throttle` is a method decorator.
- The first call in a window runs immediately.
- Calls inside the active window are dropped, not queued.
- State is tracked per instance.

## Related

- [debounce](debounce.md)
- [delay](delay.md)
- [throttleAsync](throttle-async.md)
