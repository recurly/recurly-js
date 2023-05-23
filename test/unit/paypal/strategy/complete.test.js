import assert from 'assert';

import {
  initRecurly,
  stubWindowOpen
} from '../../support/helpers';

describe('CompleteStrategy', function () {
  const validOpts = { payPalComplete: true };

  stubWindowOpen();

  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
  });

  describe('start', function () {
    it('opens iframe with PayPal Complete start path', function () {
      this.sandbox.spy(this.recurly, 'Frame');
      this.paypal.start();
      console.log({ calls: this.recurly.Frame.getCalls() });
      assert(this.recurly.Frame.calledWith({ path: '/paypal_complete/start' }));
    });
  });
});
