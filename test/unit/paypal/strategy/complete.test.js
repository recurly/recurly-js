import assert from 'assert';
import { applyFixtures } from '../../support/fixtures';

import {
  initRecurly,
  stubWindowOpen
} from '../../support/helpers';

describe('CompleteStrategy', function () {
  stubWindowOpen();

  applyFixtures();

  this.ctx.fixture = 'emptyForm';

  beforeEach(function () {
    const target = this.target = '#test-form';
    this.sandbox = sinon.createSandbox();
    this.recurly = initRecurly();
    window.paypal = this.paypalSdkStub = { Buttons: sinon.stub() };
    this.initPaypal = (opts = { payPalComplete: { target } }) => this.recurly.PayPal(opts);
    this.paypalInitialized = async () => {
      while (this.paypalSdkStub.Buttons.callCount === 0) {
        await new Promise(res => setTimeout(() => res(), 100));
      }
      return Promise.resolve();
    };
  });

  afterEach(() => delete window.paypal);

  it('requires a target', function () {
    const message = "Missing PayPal configuration option: 'payPalComplete.target'";
    assert.throws(() => this.initPaypal({ payPalComplete: {} }), { message });
    assert.throws(() => this.initPaypal({ payPalComplete: { target: '' } }), { message });
  });

  it('provides the target to the PayPal SDK', function () {
    const paypal = this.initPaypal();
  });

  it('provides buttonOptions to the PayPal SDK', async function () {
    const { target } = this;
    const buttonOptions = { arbitrary: 'options' };
    const paypal = this.initPaypal({
      payPalComplete: {
        target,
        buttonOptions
      }
    });

    await this.paypalInitialized();

    assert(this.paypalSdkStub.Buttons.calledWithMatch(buttonOptions));
  });

  it('creates a setup token', async function () {
    this.initPaypal();
    await this.paypalInitialized();

    assert.strictEqual(
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken(),
      'test-paypal-setup-token-id'
    );
  });

  it('creates a billing token', function (done) {
    const paypal = this.initPaypal();

    paypal.on('token', token => {
      assert.strictEqual(token.type, 'paypal_complete_paypal');
      assert.strictEqual(token.id, 'test-paypal-complete-billing-token-id');
      done();
    });

    this.paypalInitialized().then(() => {
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onApprove({ vaultSetupToken: 'mock' })
    });
  });

  it('forwards operational errors', function (done) {
    const example = { error: 'mock' };
    const paypal = this.initPaypal();

    paypal.on('error', error => {
      assert.strictEqual(error, example);
      done();
    });

    this.paypalInitialized().then(() => {
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onError(example)
    });
  });

  describe('withSdk', () => {
    it('loads the PayPal SDK with identifiers and configuration', async function () {
      const paypal = this.initPaypal();
      this.sandbox.stub(paypal.strategy, 'loadScriptPromise');
      delete window.paypal;
      assert.strictEqual(await paypal.strategy.withSdk(), window.paypal);
      assert(paypal.strategy.loadScriptPromise.calledWithMatch(
        'https://www.paypal.com/sdk/js?client-id=test-client-id'
        + '&disable-funding=paylater,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sepa,sofort',
        { attrs: { 'data-user-id-token': 'test-id-token' } }
      ));
    });

    it('lazy-loads', async function () {
      const stub = window.paypal = {
        Buttons: sinon.stub()
      };
      const paypal = this.initPaypal();
      assert.strictEqual(await paypal.strategy.withSdk(), stub)
      delete window.paypal;
    });
  });

  describe('start [deprecated]', () => {
    beforeEach(function () {
      this.sandbox.spy(this.recurly, 'Frame');
    });

    it('opens iframe with PayPal Complete start path', function () {
      const paypal = this.initPaypal({ payPalComplete: true });
      paypal.start();

      assert(this.recurly.Frame.calledWith(sinon.match({
        path: '/paypal_complete/start',
        payload: {}
      })));
    });

    it('passes a gateway code to the API start endpoint', function () {
      const gatewayCode = 'qn1234a5bcde';
      const paypal = this.initPaypal({ payPalComplete: true, gatewayCode });
      paypal.start();

      assert(this.recurly.Frame.calledOnce);
      assert(this.recurly.Frame.calledWith(sinon.match({
        path: '/paypal_complete/start',
        payload: {
          gateway_code: gatewayCode
        }
      })));
    });
  });
});

