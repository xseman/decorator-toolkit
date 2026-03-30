# execTime

Measure how long a method takes and report the result to a callback. This works
for both synchronous methods and methods that return promises.

## Import

```ts
import { execTime } from "decorator-toolkit/exec-time";
```

## Signature

```ts
execTime<This, Result, Args>(
	reporter?: keyof This | ((data: {
		args: Args;
		result: Result;
		execTime: number;
	}) => unknown),
)
```

## Example

```ts
import { execTime } from "decorator-toolkit/exec-time";

class ReportsService {
	record(data: { execTime: number; result: string; }): void {
		console.info(`report:${data.result}:${data.execTime}`);
	}

	@execTime<ReportsService, string, [string]>("record")
	async build(name: string): Promise<string> {
		await new Promise((resolve) => setTimeout(resolve, 50));
		return `${name}.pdf`;
	}
}
```

## Notes

- `execTime` is a method decorator.
- The reporter receives `args`, the final `result`, and `execTime` in
  milliseconds.
- Without a reporter, the decorator logs the elapsed time with `console.info`.

## Related

- [after](after.md)
- [before](before.md)
