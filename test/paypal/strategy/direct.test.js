import assert from 'assert';
import {initRecurly} from '../../support/helpers';

describe('DirectStrategy', function () {
  const displayName = 'test';
  const validOpts = { display: { displayName } };

  beforeEach(function () {
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(this.recurly, 'Frame');
  });

  afterEach(function () {
    const { sandbox } = this;
    const { Frame } = this.recurly;
    Frame.getCalls().forEach(c => c.returnValue.destroy());
    sandbox.restore();
  });

  it('passes the description to the API start endpoint', function () {
    this.paypal.start();
    assert(this.recurly.Frame.calledOnce);
    assert(this.recurly.Frame.calledWith(sinon.match({
      path: '/paypal/start',
      payload: sinon.match({ description: displayName })
    })));
  });

  context('when given a display amount', function () {
    const amount = 100;
    const opts = { display: { displayName, amount } };

    beforeEach(function () {
      this.paypal = this.recurly.PayPal(opts);
    });

    it('Passes the description and amount to the API start endpoint', function () {
      this.paypal.start();
      assert(this.recurly.Frame.calledOnce);
      assert(this.recurly.Frame.calledWith(sinon.match({
        path: '/paypal/start',
        payload: sinon.match({
          description: displayName,
          amount
        })
      })));
    });
  });

  it('emits a cancel event when the window closes', function (done) {
    this.timeout(2500); // timeout with error if paypal doesn't emit cancel event
    this.paypal.on('cancel', () => done());
    this.paypal.start();
    setTimeout(() => this.recurly.Frame.getCall(0).returnValue.emit('close'), 500);
  });
});
