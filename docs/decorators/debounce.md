# debounce

Collapse a burst of rapid calls into one later execution. Every new call resets
the timer, so only the last call in the burst runs.

## Import

```ts
import { debounce } from "decorator-toolkit/debounce";
```

## Signature

```ts
debounce(delayMs: number)
```

## Example

```ts
import { debounce } from "decorator-toolkit/debounce";

class SearchBox {
	readonly sentQueries: string[] = [];

	@debounce(250)
	submit(query: string): void {
		this.sentQueries.push(query);
	}
}
```

## Notes

- `debounce` is a method decorator.
- The decorated method becomes scheduled work. Callers should not rely on an
  immediate return value.
- State is tracked per instance, so different class instances debounce
  independently.

## Related

- [delay](delay.md)
- [throttle](throttle.md)
