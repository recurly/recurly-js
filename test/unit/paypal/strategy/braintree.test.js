import assert from 'assert';
import {
  initRecurly,
  stubBraintree,
  stubWindowOpen
} from '../../support/helpers';

describe('BraintreeStrategy', function () {
  const validOpts = { braintree: { clientAuthorization: 'valid' } };

  stubWindowOpen();
  stubBraintree();

  beforeEach(function (done) {
    this.sandbox = sinon.createSandbox();
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
    this.paypal.on('ready', done);
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
  });

  describe('start', function () {
    it('calls tokenize through braintree', function () {
      this.sandbox.spy(this.paypal.strategy.paypal, 'tokenize');
      this.paypal.start();
      assert(this.paypal.strategy.paypal.tokenize.calledOnce);
    });
  });

  describe('destroy', function () {
    it('closes the window and removes listeners', function () {
      this.sandbox.spy(this.paypal, 'off');
      this.paypal.start();
      // need to instantiate the spy after calling paypal.start to spy on `strategy.close`
      this.sandbox.spy(this.paypal.strategy, 'close');
      // need to preserve this because paypal.destroy() deletes the strategy
      const closeRef = this.paypal.strategy.close;
      this.paypal.destroy();
      assert(closeRef.calledOnce);
      assert(this.paypal.off.calledOnce);
    });
  });
});
