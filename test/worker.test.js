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
    this.worker = new IntervalWorker({ period: 1, perform: ({ jobId }) => {
      assert.strictEqual(jobId, 0);
      this.worker.destroy();
      done();
    }});
    this.worker.start();
  });

  it('calls the perform function at the period interval', function (done) {
    const then = Date.now();
    this.worker = new IntervalWorker({ period: 500, perform: () => {
      const lapse = Date.now() - then;
      assert(lapse >= 400);
      assert(lapse <= 600);
      this.worker.destroy();
      done();
    }});
    this.worker.start();
  });

  describe('#start', () => {
    it('enables the job', function (done) {
      this.worker = new IntervalWorker(this.validShortPeriod);
      assert.strictEqual(this.worker.active, false);
      assert.strictEqual(this.perform.called, false);
      this.worker.start();
      assert.strictEqual(this.worker.active, true);
      setTimeout(() => {
        assert.strictEqual(this.perform.calledOnce, true);
        done();
      }, 5);
    });
  });

  describe('#pause', () => {
    it('pauses the job', function (done) {
      const part = after(2, () => done());
      this.worker = new IntervalWorker(this.validShortPeriod);
      this.worker.start();
      assert.strictEqual(this.worker.active, true);

      setTimeout(() => {
        assert.strictEqual(this.perform.calledOnce, true);
        this.worker.pause();
        assert.strictEqual(this.worker.active, false);
        part();
      }, 5);

      setTimeout(() => {
        assert.strictEqual(this.perform.calledOnce, true);
        assert.strictEqual(this.worker.active, false);
        part();
      }, 15);
    });
  });

  describe('#destroy', () => {
    it('stops the worker', function (done) {
      const part = after(2, () => done());
      this.worker = new IntervalWorker(this.validShortPeriod);
      this.worker.start();

      setTimeout(() => {
        assert.strictEqual(this.perform.calledOnce, true);
        this.worker.destroy();
        assert.strictEqual(this.worker.active, false);
        assert.strictEqual(this.worker._intervalId, undefined);
        part();
      }, 8);

      setTimeout(() => {
        assert.strictEqual(this.perform.calledOnce, true);
        part();
      }, 15);
    });

    it('prevents further calls', function () {
      this.worker = new IntervalWorker(this.validShortPeriod);
      this.worker.start();
      this.worker.destroy();
      assert.throws(() => this.worker.start(), Error);
      assert.throws(() => this.worker.pause(), Error);
      assert.throws(() => this.worker.destroy(), Error);
    });
  });
});
