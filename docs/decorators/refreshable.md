# refreshable

Keep an accessor value up to date by polling an async data provider on an
interval.

## Import

```ts
import { refreshable } from "decorator-toolkit/refreshable";
```

## Signature

```ts
refreshable<This, Value>({
	dataProvider: keyof This | (() => Promise<Value>),
	intervalMs: number,
})
```

## Example

```ts
import { refreshable } from "decorator-toolkit/refreshable";

class MetricsStore {
	private counter = 0;

	async loadCount(): Promise<number> {
		this.counter += 1;
		return this.counter;
	}

	@refreshable<MetricsStore, number>({
		dataProvider: "loadCount",
		intervalMs: 5_000,
	})
	accessor count: number | null = 0;
}

const store = new MetricsStore();
store.count = null;
```

## Notes

- `refreshable` is an accessor decorator.
- Use the `accessor` keyword. Plain fields are not supported.
- The provider is called once during initialization and then on every interval.
- Assign `null` to stop future refreshes. Other manual assignments are ignored.

## Related

- [readonly](readonly.md)
- [cacheAsync](cache-async.md)
