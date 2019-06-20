import assert from 'assert';
import { initRecurly } from '../support/helpers';
import RiskConcern from '../../lib/recurly/risk/risk-concern';

describe('RiskConcern', function () {
  beforeEach(function () {
    const recurly = initRecurly();
    this.riskStub = { add: sinon.stub(), remove: sinon.stub(), recurly };
    this.riskConcern = new RiskConcern({ risk: this.riskStub });
  });

  it('adds itself to the provided Risk instance', function () {
    const { riskConcern, riskStub } = this;
    assert(riskStub.add.calledOnce);
    assert(riskStub.add.calledWithExactly(riskConcern));
  });

  describe('recurly', function () {
    it('references the risk recurly instance', function () {
      const { riskConcern, riskStub } = this;
      assert.strictEqual(riskConcern.recurly, riskStub.recurly);
    });
  });

  describe('error', function () {
    it('constructs and emits an error event', function (done) {
      const { riskConcern } = this;
      riskConcern.on('error', err => {
        assert(err.message, 'Option test must be value');
        done();
      });
      assert.throws(() => riskConcern.error('invalid-option'));
    });
  });

  describe('report', function () {
    it('includes its id, namespace, and call-time metadata', function () {
      const { riskConcern } = this;
      riskConcern.risk.recurly.reporter.send.reset();
      riskConcern.report('test-error', { test: 'metadata' });
      assert(riskConcern.risk.recurly.reporter.send.calledOnce);
      assert(riskConcern.risk.recurly.reporter.send.calledWithMatch(
        'base:test-error',
        { concernId: riskConcern.id, test: 'metadata' }
      ));
    });
  });

  describe('destroy', function () {
    it('calls remove', function () {
      const { riskConcern } = this;
      sinon.spy(riskConcern, 'remove');
      riskConcern.destroy();
      assert(riskConcern.remove.calledOnce);
    });

    it('calls risk.remove', function () {
      const { riskConcern, riskStub } = this;
      riskConcern.destroy();
      assert(riskStub.remove.calledOnce);
    });

    it('removes event listeners', function () {
      const { riskConcern } = this;
      const example = sinon.stub();
      riskConcern.on('test', example);
      assert.strictEqual(riskConcern.hasListeners('test', example), true);
      riskConcern.destroy();
      assert.strictEqual(riskConcern.hasListeners('test', example), false);
    });
  });
});
