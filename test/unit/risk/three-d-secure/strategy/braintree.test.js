import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import BraintreeStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/braintree';
import BraintreeLoader from '../../../../../lib/util/braintree-loader';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-braintree.json';

describe('BraintreeStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();

    this.exampleResult = {
      nonce: 'braintree-test-3ds-nonce'
    };
    this.threeDSecureInstance = {
      verifyCard: sinon.stub().returns(this.exampleResult)
    };
    this.braintree = {
      client: {
        VERSION: BraintreeLoader.BRAINTREE_CLIENT_VERSION,
        create: sinon.stub().resolves()
      },
      threeDSecure: {
        create: sinon.stub().returns(this.threeDSecureInstance)
      }
    };
    window.braintree = this.braintree;

    this.strategy = new BraintreeStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox } = this;
    sandbox.restore();
    delete window.braintree;
  });

  describe('when the braintree.js library encounters a load error', function () {
    beforeEach(function () {
      const { sandbox, threeDSecure } = this;
      sandbox.stub(BraintreeLoader, 'loadModules').rejects();
      delete window.braintree;
      this.strategy = new BraintreeStrategy({ threeDSecure, actionToken });
    });

    it('emits an error on threeDSecure', function (done) {
      const { threeDSecure } = this;
      threeDSecure.on('error', error => {
        assert.strictEqual(error.code, '3ds-vendor-load-error');
        assert.strictEqual(error.vendor, 'Braintree');
        done();
      });
    });
  });

  describe('attach', function () {
    it('initializes Braintree.js with a client token', function (done) {
      const { strategy, target } = this;

      strategy.attach(target);
      assert(window.braintree.client.create.calledOnce);
      assert(window.braintree.client.create.calledWithExactly({
        authorization: 'test-braintree-client-token'
      }));
      done();
    });

    it('instructs Braintree.js to handle the card action using the client secret', function (done) {
      const { strategy, target, braintree } = this;

      strategy.attach(target);
      strategy.on('done', result => {
        assert(this.threeDSecureInstance.verifyCard.calledOnce);
        assert(this.threeDSecureInstance.verifyCard.calledWithExactly({
          amount: 50,
          nonce: "test-braintree-nonce",
          bin: "test-braintree-bin",
          challengeRequested: true,
          collectDeviceData: true,
          onLookupComplete: sinon.match.func
        }));

        done();
      });
    });

    it('emits done with the nonce result', function (done) {
      const { strategy, target, exampleResult: { nonce } } = this;
      strategy.on('done', result => {
        assert.deepEqual(result, { paymentMethodNonce: nonce });
        done();
      });
      strategy.attach(target);
    });

    describe('when Braintree.js produces an authentication error', function () {
      beforeEach(function () {
        const { strategy } = this;
        this.exampleResult = { example: 'error', for: 'testing' };
        strategy.braintree.client.create = sinon.stub().rejects(this.exampleResult);
      });

      it('emits an error on threeDSecure', function (done) {
        const { threeDSecure, strategy, target, exampleResult: example  } = this;
        threeDSecure.on('error', error => {
          assert.strictEqual(error.code, '3ds-auth-error');
          assert.deepEqual(error.cause, example);
          done();
        });
        strategy.attach(target);
      });
    });
  });

  describe('preflight', function () {
    beforeEach(function () {
      const { recurly } = this;
      this.number = '4111111111111111';
      this.month = '01';
      this.year = '2023';
      this.cvv = '737'
      recurly.config.risk.threeDSecure.proactive = {
        enabled: true,
        gatewayCode: 'test-gateway-code',
        amount: 50,
        currency: 'USD'
      };
      recurly.request.post = sinon.stub().resolves({
        paymentMethodNonce: 'test-braintree-nonce',
        clientToken: '1234',
        bin: '411111',
      });
    });

    it('sends the correct data', function (done) {
      const { recurly, number, month, year, cvv } = this;

      BraintreeStrategy.preflight({ recurly, number, month, year, cvv }).then(() => {
        sinon.assert.calledWithMatch(recurly.request.post, {
          route: '/risk/authentications',
          data: {
            gateway_type: BraintreeStrategy.strategyName,
            gateway_code: 'test-gateway-code',
            currency: 'USD',
            number,
            month,
            year,
            cvv
          }
        });
        done();
      });
    });
  });
});
