# after

Run a hook after a decorated method returns. When `wait` is enabled and the
method returns a promise, the hook runs after the promise resolves.

## Import

```ts
import { after } from "decorator-toolkit/after";
```

## Signature

```ts
after<This, Response, Args>(
	hook: keyof This | ((params: { args: Args; response: Response; }) => unknown),
	options?: { wait?: boolean; },
)
```

## Example

```ts
import { after } from "decorator-toolkit/after";

class OrdersService {
	readonly auditLog: string[] = [];

	storeAudit(params: { args: [string]; response: string; }): Promise<void> {
		this.auditLog.push(`saved:${params.args[0]}:${params.response}`);
		return Promise.resolve();
	}

	@after<OrdersService, string, [string]>("storeAudit", { wait: true })
	async create(orderId: string): Promise<string> {
		return `order:${orderId}`;
	}
}
```

## Notes

- `after` is a method decorator.
- `hook` is a function or the name of a method on the instance. It receives
  the original arguments and the method response.
- `wait` defaults to `false`. Without it, async methods pass the unresolved
  promise to the hook.

## Related

- [before](before.md)
- [execTime](exec-time.md)
- [onError](on-error.md)
