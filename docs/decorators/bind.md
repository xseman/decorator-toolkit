# bind

Bind a method during initialization so detached callbacks keep the original
receiver.

## Import

```ts
import { bind } from "decorator-toolkit/bind";
```

## Signature

```ts
bind<This>();
```

## Example

```ts
import { bind } from "decorator-toolkit/bind";

class ButtonController {
	label = "save";

	@bind()
	handleClick(): string {
		return this.label;
	}
}

const controller = new ButtonController();
const clickHandler = controller.handleClick;

clickHandler();
```

## Notes

- `bind` is a method decorator.
- It binds once during initialization using the standard decorator initializer.
- Static methods are also supported.
- If you stack it with other method decorators, place `@bind()` above the other
  decorators when you want the final decorated method to be bound.

## Related

- [debounce](debounce.md)
- [throttle](throttle.md)
