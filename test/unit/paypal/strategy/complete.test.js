import assert from 'assert';

import {
  initRecurly,
  stubWindowOpen
} from '../../support/helpers';

describe('CompleteStrategy', function () {
  let validOpts;

  stubWindowOpen();

  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
  });

  describe('start', function () {
    validOpts = { payPalComplete: true };

    it('opens iframe with PayPal Complete start path', function () {
      this.sandbox.spy(this.recurly, 'Frame');
      this.paypal.start();

      assert(this.recurly.Frame.calledWith(sinon.match({
        path: '/paypal_complete/start',
        payload: {}
      })));
    });

    context('when given a gateway code', function () {
      const gatewayCode = 'qn1234a5bcde';
      validOpts = { payPalComplete: true,  gatewayCode: gatewayCode };


      it('Passes the description and gateway code to the API start endpoint', function () {
        this.sandbox.spy(this.recurly, 'Frame');
        this.paypal.start();

        assert(this.recurly.Frame.calledOnce);

        assert(this.recurly.Frame.calledWith(sinon.match({
          path: '/paypal_complete/start',
          payload: {
            gatewayCode: gatewayCode
          }
        })));
      });
    });
  });
});

