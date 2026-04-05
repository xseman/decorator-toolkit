import { isLegacyDecoratorCall } from "../common/decorators_legacy.js";
import { createExecTimeMethod } from "./exec-time.js";
import type {
	ExactTimeReportData,
	ReportFunction,
} from "./exec-time.js";

export type { ExactTimeReportData, ReportFunction };

export function execTime(
	target: object,
	key: string | symbol,
	descriptor: PropertyDescriptor,
): PropertyDescriptor;
export function execTime<This = any, Return = unknown, Args extends unknown[] = unknown[]>(
	arg?: ReportFunction<Awaited<Return>, Args> | keyof This,
): MethodDecorator;
export function execTime(
	targetOrArg?: unknown,
	key?: unknown,
	descriptor?: unknown,
): unknown {
	const decorate = (
		desc: PropertyDescriptor,
		arg?: ReportFunction | PropertyKey,
	): PropertyDescriptor => {
		if (typeof desc.value !== "function") {
			throw new Error("@execTime is applicable only on methods.");
		}

		desc.value = createExecTimeMethod(desc.value, arg as any);
		return desc;
	};

	if (isLegacyDecoratorCall(targetOrArg, key, descriptor)) {
		return decorate(descriptor as PropertyDescriptor);
	}

	return (_target: object, _key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor => {
		return decorate(desc, targetOrArg as ReportFunction | PropertyKey | undefined);
	};
}
