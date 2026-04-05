import { createMultiDispatchMethod } from "./multi-dispatch.js";

export function multiDispatch(dispatchesAmount: number): MethodDecorator {
	return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
		if (typeof descriptor.value !== "function") {
			throw new Error("@multiDispatch is applicable only on methods.");
		}

		descriptor.value = createMultiDispatchMethod(descriptor.value, dispatchesAmount);
		return descriptor;
	};
}
