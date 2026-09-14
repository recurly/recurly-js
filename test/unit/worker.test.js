import assert from 'assert';
import { IntervalWorker } from '../../lib/recurly/worker';

describe('IntervalWorker', () => {
  beforeEach(function () {
    const perform = this.perform = sinon.spy();
    this.valid = { perform };
    this.validShortPeriod = { perform, period: 5 };
  });

  afterEach(function () {
    // Destroy any workers that have not already been destroyed
    if (this.worker && this.worker._intervalId) this.worker.destroy();
  });

  it('requires a perform function', function () {
    assert.throws(() => new IntervalWorker(), Error, 'Invalid perform function');
    assert.throws(() => new IntervalWorker({ perform: 'invalid' }), Error, 'Invalid perform function');
  });

  it('has a default interval period of 30s', function () {
    this.worker = new IntervalWorker(this.valid);
    assert.strictEqual(this.worker.period, 30000);
  });

  it('accepts a custom interval period', function () {
    this.worker = new IntervalWorker(this.validShortPeriod);
    assert.strictEqual(this.worker.period, 5);
  });

  it('calls the perform function with a jobId', function (done) {
    const worker = this.worker = new IntervalWorker({
      period: 1,
      perform: ({ jobId }) => {
        assert.strictEqual(jobId, 0);
        worker.destroy();
        done();
      }
    });
    worker.start();
  });

  it('calls the perform function at the period interval', function (done) {
    const then = Date.now();
    const worker = this.worker = new IntervalWorker({
      period: 500,
      perform: () => {
        const lapse = Date.now() - then;
        if (lapse > 600) {
          console.log('WARN: Lapse > 100ms');
        }
        assert(lapse >= 450);
        assert(lapse <= 650);
        worker.destroy();
        done();
      }
    });
    worker.start();
  });

  describe('#start', () => {
    // Uses fake timers instead of real setTimeout windows: a 5ms period checked against a
    // 5ms window is tight enough to flake on a slow/remote runner (e.g. BrowserStack iOS),
    // where the interval firing a few ms late leaves `perform` uncalled at assertion time.
    // Faking the clock makes the tick deterministic regardless of runner speed.
    it('enables the job', function () {
      const clock = sinon.useFakeTimers();
      try {
        const { perform } = this;
        const worker = this.worker = new IntervalWorker(this.validShortPeriod);
        assert.strictEqual(worker.active, false);
        assert.strictEqual(perform.called, false);
        worker.start();
        assert.strictEqual(worker.active, true);
        clock.tick(5);
        assert.strictEqual(perform.calledOnce, true);
      } finally {
        clock.restore();
      }
    });
  });

  describe('#pause', () => {
    // See #start above: real setTimeout windows this tight are flaky on slow/remote runners,
    // so this uses fake timers for deterministic ticking.
    it('pauses the job', function () {
      const clock = sinon.useFakeTimers();
      try {
        const { perform } = this;
        const worker = this.worker = new IntervalWorker(this.validShortPeriod);
        worker.start();
        assert.strictEqual(worker.active, true);

        clock.tick(5);
        assert.strictEqual(perform.calledOnce, true);
        worker.pause();
        assert.strictEqual(worker.active, false);

        clock.tick(10);
        assert.strictEqual(perform.calledOnce, true);
        assert.strictEqual(worker.active, false);
      } finally {
        clock.restore();
      }
    });
  });

  describe('#destroy', () => {
    // See #start above: real setTimeout windows this tight are flaky on slow/remote runners,
    // so this uses fake timers for deterministic ticking.
    it('stops the worker', function () {
      const clock = sinon.useFakeTimers();
      try {
        const { valid, perform } = this;
        const worker = this.worker = new IntervalWorker({ period: 50, ...valid });
        worker.start();

        clock.tick(75);
        assert.strictEqual(perform.calledOnce, true);
        worker.destroy();
        assert.strictEqual(worker.active, false);
        assert.strictEqual(worker._intervalId, undefined);

        clock.tick(200);
        assert.strictEqual(perform.calledOnce, true);
      } finally {
        clock.restore();
      }
    });

    it('prevents further calls', function () {
      const worker = this.worker = new IntervalWorker(this.validShortPeriod);
      worker.start();
      worker.destroy();
      assert.throws(() => worker.start(), Error);
      assert.throws(() => worker.pause(), Error);
      assert.throws(() => worker.destroy(), Error);
    });
  });
});
