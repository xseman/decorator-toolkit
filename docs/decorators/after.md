# after

Run a hook after a decorated method returns. When `wait` is enabled and the
method returns a promise, the hook runs after the promise resolves.

## Import

```ts
import { after } from "decorator-toolkit/after";
```

For legacy TypeScript decorators, import from `decorator-toolkit/after/legacy` or import `{ after }` from `decorator-toolkit/legacy`.

## Signature

```ts
after<This, Response, Args>({
	func: keyof This | ((params: { args: Args; response: Response; }) => unknown),
	wait?: boolean,
})
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

	@after<OrdersService, string, [string]>({
		func: "storeAudit",
		wait: true,
	})
	async create(orderId: string): Promise<string> {
		return `order:${orderId}`;
	}
}
```

## Notes

- `after` is a method decorator.
- The hook receives the original arguments and the method response.
- `wait` defaults to `false`. Without it, async methods pass the unresolved
  promise to the hook.

## Related

- [before](before.md)
- [execTime](exec-time.md)
- [onError](on-error.md)
