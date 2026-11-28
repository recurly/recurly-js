import assert from 'assert';
import BraintreeLoader from '../../../../lib/util/braintree-loader';
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
    this.venmo = this.recurly.Venmo(validOpts);
    this.venmo.on('ready', done);
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
  });

  describe('start', function () {
    it('calls tokenize through braintree', function () {
      this.sandbox.spy(this.venmo.strategy.venmo, 'tokenize');
      this.venmo.start();
      assert(this.venmo.strategy.venmo.tokenize.calledOnce);
    });
  });

  describe('when Braintree tokenization fails', function () {
    beforeEach(function () {
      this.cancelSpy = this.sandbox.spy();
      this.errorSpy = this.sandbox.spy();
      this.venmo.on('cancel', this.cancelSpy);
      this.venmo.on('error', this.errorSpy);
    });

    ['VENMO_CANCELED', 'VENMO_APP_CANCELED', 'VENMO_DESKTOP_CANCELED'].forEach(code => {
      it(`emits only a cancel event when the error code is ${code}`, function (done) {
        this.sandbox.stub(this.venmo.strategy.venmo, 'tokenize').rejects({ code });
        this.venmo.start();
        setTimeout(() => {
          try {
            assert(this.cancelSpy.calledOnce);
            assert(!this.errorSpy.called);
            done();
          } catch (e) { done(e); }
        });
      });
    });

    it('emits only an error event for any other error', function (done) {
      const cause = { code: 'VENMO_TOKENIZATION_FAILED' };
      this.sandbox.stub(this.venmo.strategy.venmo, 'tokenize').rejects(cause);
      this.venmo.start();
      setTimeout(() => {
        try {
          assert(!this.cancelSpy.called);
          assert(this.errorSpy.calledOnce);
          const [err] = this.errorSpy.firstCall.args;
          assert.strictEqual(err.code, 'venmo-braintree-tokenize-braintree-error');
          assert.strictEqual(err.cause, cause);
          done();
        } catch (e) { done(e); }
      });
    });
  });

  describe('destroy', function () {
    it('closes the window and removes listeners', function () {
      this.sandbox.spy(this.venmo, 'off');
      this.venmo.destroy();
      assert(this.venmo.off.calledOnce);
    });
  });

  describe('when Braintree modules fail to load', function () {
    it('emits a venmo-load-error and does not initialize', function (done) {
      const sandbox = sinon.createSandbox();
      sandbox.stub(BraintreeLoader, 'loadModules').rejects(new Error('boom'));
      const recurly = initRecurly();
      const venmo = recurly.Venmo(validOpts);
      const create = sandbox.spy(window.braintree.client, 'create');

      venmo.on('error', err => {
        if (err.code !== 'venmo-load-error') return;
        setTimeout(() => {
          try {
            assert(!create.called);
            done();
          } catch (e) { done(e); } finally {
            sandbox.restore();
            recurly.destroy();
          }
        });
      });
    });
  });
});
