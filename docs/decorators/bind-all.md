# bindAll

Bind all public instance methods declared directly on a class during instance
construction.

## Import

```ts
import { bindAll } from "decorator-toolkit/bind-all";
```

For legacy TypeScript decorators, import from `decorator-toolkit/bind-all/legacy`.

## Signature

```ts
bindAll();

// Default behavior: @bindAll or @bindAll()
```

## Example

```ts
import { bindAll } from "decorator-toolkit/bind-all";

@bindAll
class DialogController {
	title = "settings";

	open(): string {
		return this.title;
	}

	close(): string {
		return `${this.title}:closed`;
	}
}

const controller = new DialogController();
const open = controller.open;

open();
```

## Notes

- `bindAll` is a class decorator.
- Both `@bindAll` and `@bindAll()` use the default class-wide binding behavior.
- It binds only public instance methods declared directly on the decorated
  class.
- It does not bind statics, accessors, inherited methods, or private `#`
  methods.
- It returns a replacement subclass, so use it only when class-wide binding is
  the actual intent.

## Related

- [bind](bind.md)
- [debounce](debounce.md)
