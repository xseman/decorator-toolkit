# delay

Schedule a method to run after a fixed timeout. Unlike `debounce`, every call is
still executed.

## Import

```ts
import { delay } from "decorator-toolkit/delay";
```

For legacy TypeScript decorators, import from `decorator-toolkit/delay/legacy`.

## Signature

```ts
delay(delayMs: number)
```

## Example

```ts
import { delay } from "decorator-toolkit/delay";

class Notifications {
	readonly events: string[] = [];

	@delay(1_000)
	show(message: string): void {
		this.events.push(message);
	}
}
```

## Notes

- `delay` is a method decorator.
- Each call schedules its own timer.
- The decorated method becomes fire-and-forget scheduled work.

## Related

- [debounce](debounce.md)
- [throttle](throttle.md)
