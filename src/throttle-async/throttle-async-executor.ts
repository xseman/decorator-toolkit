import { Queue } from "../common/queue.js";
import type { AsyncMethod } from "../common/types.js";

type CallArgs<This, Args extends unknown[], Return> = {
	context: This;
	args: Args;
	resolve: (value: Return | PromiseLike<Return>) => void;
	reject: (error?: unknown) => void;
};

export class ThrottleAsyncExecutor<This, Args extends unknown[], Return> {
	private onGoingCallsCount = 0;
	private readonly callsToRun = new Queue<CallArgs<This, Args, Return>>();

	constructor(
		private readonly fun: AsyncMethod<This, Args, Return>,
		private readonly parallelCalls: number,
	) {
	}

	exec(context: This, args: Args): Promise<Return> {
		return new Promise<Return>((resolve, reject) => {
			this.callsToRun.enqueue({
				args,
				context,
				reject,
				resolve,
			});

			this.tryCall();
		});
	}

	private tryCall(): void {
		while (this.callsToRun.getSize() > 0 && this.onGoingCallsCount < this.parallelCalls) {
			const callArgs = this.callsToRun.dequeue();
			if (!callArgs) {
				return;
			}

			this.onGoingCallsCount += 1;
			this.fun.apply(callArgs.context, callArgs.args)
				.then(callArgs.resolve)
				.catch(callArgs.reject)
				.finally(() => {
					this.onGoingCallsCount -= 1;
					this.tryCall();
				});
		}
	}
}
