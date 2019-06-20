import after from 'lodash.after';
import assert from 'assert';
import {IntervalWorker} from '../lib/recurly/worker';

describe('IntervalWorker', () => {
  beforeEach(function () {
    const perform = this.perform = sinon.spy();
    this.valid = { perform };
    this.validShortPeriod = { perform, period: 5 };
  });

  afterEach(function () {
    // Destroy any workers that have not already been destroyed
    if (this.worker && this.worker._intervalId) this.worker.destroy();
  })

  it('requires a perform function', function () {
    assert.throws(() => new IntervalWorker(), Error, 'Invalid perform function');
    assert.throws(() => new IntervalWorker({ perform: 'invalid' }), Error, 'Invalid perform function');
  });

  it('has a default interval period of 10s', function () {
    this.worker = new IntervalWorker(this.valid);
    assert.strictEqual(this.worker.period, 10000);
  });

  it('accepts a custom interval period', function () {
    this.worker = new IntervalWorker(this.validShortPeriod);
    assert.strictEqual(this.worker.period, 5);
  });

  it('calls the perform function with a jobId', function (done) {
    const start = Date.now();
    const worker = this.worker = new IntervalWorker({ period: 1, perform: ({ jobId }) => {
      assert.strictEqual(jobId, 0);
      worker.destroy();
      done();
    }});
    worker.start();
  });

  it('calls the perform function at the period interval', function (done) {
    const then = Date.now();
    const worker = this.worker = new IntervalWorker({ period: 500, perform: () => {
      const lapse = Date.now() - then;
      assert(lapse >= 400);
      assert(lapse <= 600);
      worker.destroy();
      done();
    }});
    worker.start();
  });

  describe('#start', () => {
    it('enables the job', function (done) {
      const { perform } = this;
      const worker = this.worker = new IntervalWorker(this.validShortPeriod);
      assert.strictEqual(worker.active, false);
      assert.strictEqual(perform.called, false);
      worker.start();
      assert.strictEqual(worker.active, true);
      setTimeout(() => {
        assert.strictEqual(perform.calledOnce, true);
        done();
      }, 5);
    });
  });

  describe('#pause', () => {
    it('pauses the job', function (done) {
      const { perform } = this;
      const part = after(2, () => done());
      const worker = this.worker = new IntervalWorker(this.validShortPeriod);
      worker.start();
      assert.strictEqual(worker.active, true);

      setTimeout(() => {
        assert.strictEqual(perform.calledOnce, true);
        worker.pause();
        assert.strictEqual(worker.active, false);
        part();
      }, 5);

      setTimeout(() => {
        assert.strictEqual(perform.calledOnce, true);
        assert.strictEqual(worker.active, false);
        part();
      }, 15);
    });
  });

  describe('#destroy', () => {
    it('stops the worker', function (done) {
      const { valid, perform } = this;
      const part = after(2, () => done());
      const worker = this.worker = new IntervalWorker({ period: 750, ...valid });
      worker.start();

      setTimeout(() => {
        assert.strictEqual(perform.calledOnce, true);
        worker.destroy();
        assert.strictEqual(worker.active, false);
        assert.strictEqual(worker._intervalId, undefined);
        part();
      }, 1000);

      setTimeout(() => {
        assert.strictEqual(perform.calledOnce, true);
        part();
      }, 1800);
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
