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
    this.payPalSdkButtonRenderStub = sinon.stub();
    window.paypal = this.paypalSdkStub = { Buttons: sinon.stub().returns({ render: this.payPalSdkButtonRenderStub }) };
    this.initPaypal = (opts = { payPalComplete: { target } }) => this.recurly.PayPal(opts);
    this.paypalInitialized = async () => {
      while (this.paypalSdkStub.Buttons.callCount === 0) {
        await new Promise(res => setTimeout(() => res(), 100));
      }
      return Promise.resolve();
    };
  });

  afterEach(function () {
    this.recurly.destroy();
    delete window.paypal;
  });

  it('requires a target', function () {
    const message = "Missing PayPal configuration option: 'payPalComplete.target'";
    assert.throws(() => this.initPaypal({ payPalComplete: {} }), { message });
    assert.throws(() => this.initPaypal({ payPalComplete: { target: '' } }), { message });
  });

  it('provides the target to the PayPal SDK', async function () {
    this.initPaypal();

    await this.paypalInitialized();

    assert(this.payPalSdkButtonRenderStub.calledWithMatch(this.target));
  });

  it('provides buttonOptions to the PayPal SDK', async function () {
    const { target } = this;
    const buttonOptions = { arbitrary: 'options' };

    this.initPaypal({
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

  it('passes gatewayCode to the setup token request', async function () {
    const { target } = this;
    const gatewayCode = 'test-gateway-code';
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');

    this.initPaypal({ payPalComplete: { target }, gatewayCode });
    await this.paypalInitialized();
    const setupTokenId = await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

    assert(postSpy.calledWithMatch({ data: { gateway_code: gatewayCode } }));
    assert.strictEqual(setupTokenId, 'test-paypal-setup-token-id');
  });

  it('passes usagePattern to the setup token request', async function () {
    const { target } = this;
    const usagePattern = 'SUBSCRIPTION_PREPAID';
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');

    this.initPaypal({ payPalComplete: { target, usagePattern } });
    await this.paypalInitialized();
    const setupTokenId = await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

    assert(postSpy.calledWithMatch({ data: { usage_pattern: usagePattern } }));
    assert.strictEqual(setupTokenId, 'test-paypal-setup-token-id');
  });

  it('passes billingPlan to the setup token request', async function () {
    const { target } = this;
    const billingPlan = { cycles: 12, frequency: 'MONTH', pricing: [{ amount: { value: '9.99', currency_code: 'USD' } }] };
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');

    this.initPaypal({ payPalComplete: { target, billingPlan } });
    await this.paypalInitialized();
    const setupTokenId = await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

    assert(postSpy.calledWithMatch({ data: { billing_plan: billingPlan } }));
    assert.strictEqual(setupTokenId, 'test-paypal-setup-token-id');
  });

  describe('when a CheckoutPricing instance is provided', function () {
    function subscriptionPricingFactory (planCode, recurly) {
      return new Promise(resolve => {
        const sub = recurly.Pricing.Subscription();
        sub.plan(planCode).address({ country: 'US' }).done(() => resolve(sub));
      });
    }

    async function checkoutPricingFactory (planCode, recurly) {
      const sub = await subscriptionPricingFactory(planCode, recurly);
      return new Promise(resolve => {
        const checkout = recurly.Pricing.Checkout();
        checkout.subscription(sub).done(() => resolve(checkout));
      });
    }

    it('derives billing_plan from the plan period and unit price', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic-2', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({
        data: {
          billing_plan: {
            billing_cycles: [sinon.match({
              frequency: { interval_unit: 'MONTH', interval_count: 1 },
              pricing_scheme: {
                pricing_model: 'FIXED',
                price: { value: '90.09', currency_code: 'USD' }
              }
            })]
          }
        }
      }));
    });

    it('sanitizes the plan name in the billing_plan (replaces underscores/hyphens with spaces, removes special chars)', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic-name-sanitize', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      assert.strictEqual(setupTokenCall.args[0].data.billing_plan.name, 'Basic Plan Name Special');
    });

    it('includes one_time_charges.setup_fee and total_amount when the plan has a setup fee', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({
        data: {
          billing_plan: {
            one_time_charges: {
              setup_fee:    { value: '2.00',  currency_code: 'USD' },
              total_amount: { value: '21.99', currency_code: 'USD' }
            }
          }
        }
      }));
    });

    it('omits one_time_charges.setup_fee and only sends total_amount when the plan has no setup fee', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('free-trial-no-setup', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const { one_time_charges } = setupTokenCall.args[0].data.billing_plan;
      assert(!('setup_fee' in one_time_charges), 'setup_fee should not be present when zero');
      assert.deepStrictEqual(one_time_charges.total_amount, { value: '0.00', currency_code: 'USD' });
    });

    it('includes a TRIAL billing cycle as the first entry when the plan has a trial period', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('free-trial', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({
        data: {
          billing_plan: {
            billing_cycles: [
              sinon.match({
                tenure_type:  'TRIAL',
                sequence:     1,
                total_cycles: 1,
                frequency:    { interval_unit: 'DAY', interval_count: 7 }
              }),
              sinon.match({ tenure_type: 'REGULAR' })
            ]
          }
        }
      }));
    });

    it('places the REGULAR billing cycle second with plan pricing when the plan has a trial period', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('free-trial', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({
        data: {
          billing_plan: {
            billing_cycles: [
              sinon.match({ tenure_type: 'TRIAL' }),
              sinon.match({
                tenure_type: 'REGULAR',
                frequency:   { interval_unit: 'MONTH', interval_count: 1 },
                pricing_scheme: {
                  pricing_model: 'FIXED',
                  price: { value: '49.00', currency_code: 'USD' }
                }
              })
            ]
          }
        }
      }));
    });

    it('sets sequence 2 on the REGULAR cycle when a trial is present', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('free-trial', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const regularCycle = setupTokenCall.args[0].data.billing_plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
      assert.strictEqual(regularCycle.sequence, 2);
    });

    it('sets sequence 1 on the REGULAR cycle when no trial is present', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const regularCycle = setupTokenCall.args[0].data.billing_plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
      assert.strictEqual(regularCycle.sequence, 1);
    });

    it('sets start_date on the REGULAR cycle to the trial end date when a trial is present', async function () {
      const { target } = this;
      const clock = sinon.useFakeTimers({ now: new Date(2026, 2, 15).getTime(), toFake: ['Date'] });
      const pricing = await checkoutPricingFactory('free-trial', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();
      clock.restore();

      // free-trial has a 7-day trial; compute expected the same way dateFromNow does (local midnight → ISO string)
      // so the assertion is timezone-independent
      const expectedStartDate = new Date(2026, 2, 15 + 7).toISOString().substr(0, 10);
      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const regularCycle = setupTokenCall.args[0].data.billing_plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
      assert.strictEqual(regularCycle.start_date, expectedStartDate);
    });

    it('omits start_date from the REGULAR cycle when no trial is present', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const regularCycle = setupTokenCall.args[0].data.billing_plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
      assert(!('start_date' in regularCycle), 'start_date should not be present when there is no trial');
    });

    it('includes only a REGULAR billing cycle when the plan has no trial period', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      const { billing_cycles } = setupTokenCall.args[0].data.billing_plan;
      assert.strictEqual(billing_cycles.length, 1);
      assert.strictEqual(billing_cycles[0].tenure_type, 'REGULAR');
    });

    it('sets pricing_scheme.pricing_model to VARIABLE when usage-based add-ons are selected', async function () {
      const { target } = this;
      const sub = await subscriptionPricingFactory('basic', this.recurly);
      await new Promise(resolve => sub.addon('with_usage').done(resolve));
      const checkout = await new Promise(resolve => {
        const c = this.recurly.Pricing.Checkout();
        c.subscription(sub).done(() => resolve(c));
      });
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing: checkout } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({
        data: {
          billing_plan: {
            billing_cycles: [sinon.match({
              pricing_scheme: { pricing_model: 'VARIABLE' }
            })]
          }
        }
      }));
    });

    it('derives usage_pattern as SUBSCRIPTION_PREPAID when no usage-based add-ons are selected', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic-2', this.recurly);
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({ data: { usage_pattern: 'SUBSCRIPTION_PREPAID' } }));
    });

    it('derives usage_pattern as SUBSCRIPTION_POSTPAID when usage-based add-ons are selected', async function () {
      const { target } = this;
      const sub = await subscriptionPricingFactory('basic', this.recurly);
      await new Promise(resolve => sub.addon('with_usage').done(resolve));
      const checkout = await new Promise(resolve => {
        const c = this.recurly.Pricing.Checkout();
        c.subscription(sub).done(() => resolve(c));
      });
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing: checkout } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({ data: { usage_pattern: 'RECURRING_POSTPAID' } }));
    });

    it('derives usage_pattern from the first subscription when multiple are present', async function () {
      const { target } = this;
      const sub1 = await subscriptionPricingFactory('basic-2', this.recurly);
      const sub2 = await subscriptionPricingFactory('basic', this.recurly);
      const checkout = await new Promise(resolve => {
        const c = this.recurly.Pricing.Checkout();
        c.subscription(sub1).subscription(sub2).done(() => resolve(c));
      });
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing: checkout } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({ data: { usage_pattern: 'SUBSCRIPTION_PREPAID' } }));
    });

    it('derives usage_pattern as SUBSCRIPTION_POSTPAID when any usage add-on is selected', async function () {
      const { target } = this;
      const sub = await subscriptionPricingFactory('basic', this.recurly);
      await new Promise(resolve => sub.addon('snarf').done(resolve));
      await new Promise(resolve => sub.addon('with_usage').done(resolve));
      const checkout = await new Promise(resolve => {
        const c = this.recurly.Pricing.Checkout();
        c.subscription(sub).done(() => resolve(c));
      });
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing: checkout } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({ data: { usage_pattern: 'RECURRING_POSTPAID' } }));
    });

    it('omits billing_plan and usage_pattern when the pricing instance has no valid subscriptions', async function () {
      const { target } = this;
      const pricing = this.recurly.Pricing.Checkout();
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
      assert(!('usage_pattern' in setupTokenCall.args[0].data), 'usage_pattern should not be present');
      assert(!('billing_plan' in setupTokenCall.args[0].data), 'billing_plan should not be present');
    });

    it('ignores explicit usagePattern and billingPlan when pricing is set', async function () {
      const { target } = this;
      const pricing = await checkoutPricingFactory('basic-2', this.recurly);
      const usagePattern = 'RECURRING_POSTPAID';
      const billingPlan = { cycles: 3, frequency: 'YEAR', pricing: [{ amount: { value: '99.00', currency_code: 'USD' } }] };
      const postSpy = this.sandbox.spy(this.recurly.request, 'post');

      this.initPaypal({ payPalComplete: { target, pricing, usagePattern, billingPlan } });
      await this.paypalInitialized();
      await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

      assert(postSpy.calledWithMatch({ data: { usage_pattern: 'SUBSCRIPTION_PREPAID' } }));
      assert(!postSpy.calledWithMatch({ data: { billing_plan: billingPlan } }), 'explicit billingPlan should be ignored');
    });
  });

  it('omits usagePattern and billingPlan from the setup token request when not provided', async function () {
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');

    this.initPaypal();
    await this.paypalInitialized();
    await this.paypalSdkStub.Buttons.getCall(0).firstArg.createVaultSetupToken();

    const setupTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/setup_tokens');
    assert(setupTokenCall, 'Expected a setup token POST request');
    assert(!('usage_pattern' in setupTokenCall.args[0].data), 'usage_pattern should not be present');
    assert(!('billing_plan' in setupTokenCall.args[0].data), 'billing_plan should not be present');
  });

  it('creates a billing token', function (done) {
    const paypal = this.initPaypal();

    paypal.on('token', token => {
      assert.strictEqual(token.type, 'paypal_complete_paypal');
      assert.strictEqual(token.id, 'test-paypal-complete-billing-token-id');
      done();
    });

    this.paypalInitialized().then(() => {
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onApprove({ vaultSetupToken: 'mock' });
    });
  });

  it('passes gatewayCode to the billing token request', function (done) {
    const { target } = this;
    const gatewayCode = 'test-gateway-code';
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');
    const paypal = this.initPaypal({ payPalComplete: { target }, gatewayCode });

    paypal.on('token', token => {
      const billingTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/billing_tokens');
      assert(billingTokenCall, 'Expected a billing token POST request');
      assert.strictEqual(billingTokenCall.args[0].data.gateway_code, gatewayCode);
      assert.strictEqual(token.type, 'paypal_complete_paypal');
      assert.strictEqual(token.id, 'test-paypal-complete-billing-token-id');
      done();
    });

    this.paypalInitialized().then(() => {
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onApprove({ vaultSetupToken: 'mock' });
    });
  });

  it('does not pass usage_pattern or billing_plan to the billing token request', function (done) {
    const { target } = this;
    const usagePattern = 'SUBSCRIPTION_PREPAID';
    const billingPlan = { cycles: 1, billing_cycles: [{ frequency: { interval_unit: 'MONTH', interval_count: 1 } }] };
    const postSpy = this.sandbox.spy(this.recurly.request, 'post');
    const paypal = this.initPaypal({ payPalComplete: { target, usagePattern, billingPlan } });

    paypal.on('token', () => {
      const billingTokenCall = postSpy.getCalls().find(c => c.args[0].route === '/paypal_complete/billing_tokens');
      assert(billingTokenCall, 'Expected a billing token POST request');
      assert(!('usage_pattern' in billingTokenCall.args[0].data), 'usage_pattern should not be in the billing token request');
      assert(!('billing_plan' in billingTokenCall.args[0].data), 'billing_plan should not be in the billing token request');
      done();
    });

    this.paypalInitialized().then(() => {
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onApprove({ vaultSetupToken: 'mock' });
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
      this.paypalSdkStub.Buttons.getCall(0).firstArg.onError(example);
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
        + '&merchant-id=test-merchant-id'
        + '&disable-funding=bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sepa,sofort',
        {
          attrs: {
            'data-partner-attribution-id': 'test-bn-code',
            'data-user-id-token': 'test-id-token'
          }
        }
      ));
    });

    it('lazy-loads', async function () {
      const stub = window.paypal = {
        Buttons: sinon.stub()
      };
      const paypal = this.initPaypal();
      assert.strictEqual(await paypal.strategy.withSdk(), stub);
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

