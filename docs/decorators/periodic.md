# periodic

Call a method on an interval for the lifetime of the instance. The timer starts
at construction and stops when the instance is disposed with `using`.

## Import

```ts
import { periodic } from "decorator-toolkit/periodic";
```

## Signature

```ts
periodic<This>(
	input:
		| number
		| {
			intervalMs: number;
			immediate?: boolean; // default false
			overlap?: "skip" | "allow"; // default "skip"
			onError?: keyof This | ((error: unknown) => void | Promise<void>);
		},
)
```

## Example

```ts
import { periodic } from "decorator-toolkit/periodic";

class HealthMonitor {
	status = "unknown";

	@periodic<HealthMonitor>({ intervalMs: 5_000, immediate: true, onError: "report" })
	async check(): Promise<void> {
		this.status = (await fetch("/health")).ok ? "ok" : "down";
	}

	report(error: unknown): void {
		console.error(error);
	}
}

{
	using monitor = new HealthMonitor();
	// checks every 5 s while in scope
} // timer cleared here
```

## Notes

- `periodic` is a method decorator for instance methods; the method is called
  with no arguments.
- `overlap: "skip"` drops a tick while the previous async run is still pending.
- Errors go to `onError` and the interval keeps running; without `onError` they
  are swallowed.
- The timer is `unref`'d where supported, so it does not keep a Node process
  alive, but it does keep the instance reachable until disposed.
- To poll a value into a field, assign it inside the method.

## Related

- [debounce](debounce.md)
- [dispose](dispose.md)
- [throttle](throttle.md)
