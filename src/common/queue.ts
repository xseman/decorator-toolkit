type QueueNode<T> = {
	next: QueueNode<T> | null;
	value: T;
};

export class Queue<T> {
	private firstItem: QueueNode<T> | null = null;
	private lastItem: QueueNode<T> | null = null;
	private size = 0;

	getSize(): number {
		return this.size;
	}

	isEmpty(): boolean {
		return this.size === 0;
	}

	enqueue(item: T): void {
		const newItem = Queue.createItem(item);

		if (this.isEmpty()) {
			this.firstItem = newItem;
			this.lastItem = newItem;
		} else if (this.lastItem) {
			this.lastItem.next = newItem;
			this.lastItem = newItem;
		}

		this.size += 1;
	}

	dequeue(): T | undefined {
		if (!this.firstItem) {
			return undefined;
		}

		const removedItem = this.firstItem.value;
		this.firstItem = this.firstItem.next;
		if (!this.firstItem) {
			this.lastItem = null;
		}
		this.size -= 1;

		return removedItem;
	}

	private static createItem<T>(value: T): QueueNode<T> {
		return {
			next: null,
			value,
		};
	}
}
