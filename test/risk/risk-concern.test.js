import assert from 'assert';
import RiskConcern from '../../lib/recurly/risk/risk-concern';

describe('RiskConcern', function () {
  beforeEach(function () {
    this.riskStub = { add: sinon.stub(), remove: sinon.stub(), recurly: sinon.stub() };
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
    it('constructs and throws an error', function () {
      const { riskConcern } = this;
      assert.throws(() => {
        riskConcern.error('invalid-option', { name: 'test', expect: 'value' })
      }, 'Option test must be value');
    });

    it('emits an error event', function (done) {
      const { riskConcern } = this;
      riskConcern.on('error', err => {
        assert(err.message, 'Option test must be value');
        done();
      });
      assert.throws(() => riskConcern.error('invalid-option'));
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
