import assert from 'assert';
import { BraintreeStrategy } from '../../../lib/recurly/venmo/strategy/braintree';
import {
  initRecurly,
  stubBraintree,
  stubWindowOpen
} from '../support/helpers';

describe('Recurly.Venmo', function () {
  stubWindowOpen();
  stubBraintree();

  const validOpts = { braintree: { clientAuthorization: 'valid' } };

  beforeEach(function () {
    this.recurly = initRecurly();
    this.venmo = this.recurly.Venmo(validOpts);
    this.sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
  });

  it('uses a Braintree strategy by default', function () {
    assert(this.venmo.strategy instanceof BraintreeStrategy);
  });

  describe('destroy', function () {
    it('deletes the strategy and removes listeners', function () {
      this.sandbox.spy(this.venmo, 'off');
      this.venmo.destroy();
      assert.equal(this.venmo.strategy, undefined);
      assert(this.venmo.off.calledOnce);
    });
  });
});
