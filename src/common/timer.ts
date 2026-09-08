export interface TimerHandle {
	clear(): void;
}

export function createInterval(
	callback: () => void,
	intervalMs: number,
): TimerHandle {
	const handle = setInterval(callback, intervalMs);

	if (typeof (handle as unknown as { unref?: () => void; }).unref === "function") {
		(handle as unknown as { unref: () => void; }).unref();
	}

	return {
		clear() {
			clearInterval(handle);
		},
	};
}
