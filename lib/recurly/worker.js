const DEFAULT_PERIOD = 10000; // 10 seconds

export class IntervalWorker {
  constructor ({ period = DEFAULT_PERIOD, perform } = {}) {
    if (typeof perform !== 'function') throw new Error('Invalid perform function');
    this.active = false;
    this.jobId = 0;
    this.tick = this.tick.bind(this);
    this.period = period;
    this.perform = perform;
    this._intervalId = setInterval(this.tick, this.period);
    window.addEventListener('beforeunload', this.tick);
  }

  start () {
    this.guard();
    this.active = true;
  }

  pause () {
    this.guard();
    this.active = false;
  }

  destroy () {
    this.pause();
    clearInterval(this._intervalId);
    delete this._intervalId;
  }

  // Private

  tick () {
    if (!this.active) return;
    try {
      this.perform({ jobId: this.jobId });
    } finally {
      this.jobId++;
    }
  }

  guard () {
    if (typeof this._intervalId === 'number') return;
    throw new Error('This Worker has been destroyed and can no longer be used');
  }
}
