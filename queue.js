export default class Queue {

	constructor(executor) {
		this.queue = [];
		this.executor = executor;
		this.isRunning = false;
	}

	_execute() {
		const data = this.queue.splice(0, 1)[0];
		const onComplete = () => {
			if (this.queue.length === 0) {
				return this.isRunning = false;
			}
			this._execute();
		};
		this.executor(data)
			.then(onComplete)
			.catch(onComplete);
	}

	push(data) {
		this.queue.push(data);
		if (!this.isRunning) {
			this.isRunning = true;
			this._execute();
		}
	}
}
