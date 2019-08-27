import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import BraintreeStrategy from '../../../../lib/recurly/risk/three-d-secure/strategy/braintree';
import actionToken from '../../../server/fixtures/tokens/action-token-braintree.json';
import Promise from 'promise';

describe('BraintreeStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();
    this.isIE = !!document.documentMode;

    if (this.isIE) window.Promise = Promise;
    this.exampleResult = {
      nonce: 'braintree-test-3ds-nonce'
    };
    this.threeDSecureInstance = {
      verifyCard: sinon.stub().returns(this.exampleResult)
    };
    this.braintree = {
      client: {
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
    const { isIE, sandbox } = this;
    sandbox.restore();
    delete window.braintree;
    if (isIE) delete window.Promise;
  });

  describe('when the braintree.js library encounters a load error', function () {
    beforeEach(function () {
      const { sandbox, threeDSecure } = this;
      sandbox.replace(BraintreeStrategy.prototype, 'urlForResource', (f) => '/api/mock-404');
      delete window.braintree;
      this.strategy = new BraintreeStrategy({ threeDSecure, actionToken });
    });

    it('emits an error on threeDSecure', function (done) {
      const { threeDSecure } = this;
      threeDSecure.on('error', error => {
        assert.strictEqual(error.code, '3ds-vendor-load-error');
        assert.strictEqual(error.vendor, 'Braintree');
        done();
      })
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
          amount: 5000,
          nonce: "test-braintree-nonce",
          bin: "test-braintree-bin",
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
});
