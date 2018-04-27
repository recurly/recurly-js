import assert from 'assert';
import {initRecurly} from '../../support/helpers';

const sinon = window.sinon;

describe('DirectStrategy', function () {
  const displayName = 'test';
  const validOpts = { display: { displayName } };

  beforeEach(function () {
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
    sinon.spy(this.recurly, 'Frame');
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
});
