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

// Default behavior: @bind or @bind()
```

## Example

```ts
import { bind } from "decorator-toolkit/bind";

class ButtonController {
	label = "save";

	@bind
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
- Both `@bind` and `@bind()` use the default binding behavior.
- It binds once during initialization using the standard decorator initializer.
- Static methods are also supported.
- Under legacy `experimentalDecorators` the method is bound lazily on first
  access instead of at construction.
- Stacking order does not matter: the final decorated method is bound, wherever
  `@bind` sits. Under legacy `experimentalDecorators` `@bind` must be the
  topmost decorator.

## Related

- [debounce](debounce.md)
- [throttle](throttle.md)
