class ExecutionQueue {
  constructor({ concurrency = 4 } = {}) {
    this.concurrency = concurrency;
    this.activeCount = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject
      });

      this.runNext();
    });
  }

  runNext() {
    if (this.activeCount >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();

    if (!item) {
      return;
    }

    this.activeCount++;

    Promise.resolve()
      .then(() => item.task())
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        this.activeCount--;
        this.runNext();
      });
  }

  getStats() {
    return {
      concurrency: this.concurrency,
      activeCount: this.activeCount,
      waitingCount: this.queue.length
    };
  }
}

const executionQueue = new ExecutionQueue({
  concurrency: Number(
    process.env.CODE_EXECUTION_CONCURRENCY || 4
  )
});

module.exports = {
  executionQueue,
  ExecutionQueue
};