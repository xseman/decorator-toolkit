export class TaskExec {
	private readonly tasks = new Set<ReturnType<typeof setTimeout>>();

	exec(func: () => void, ttl: number): void {
		const handler = setTimeout(() => {
			this.tasks.delete(handler);
			func();
		}, Math.max(ttl, 0));

		this.tasks.add(handler);
	}

	clear(): void {
		for (const handler of this.tasks) {
			clearTimeout(handler);
		}

		this.tasks.clear();
	}
}
