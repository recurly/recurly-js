import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import BraintreeStrategy from '../../../../lib/recurly/risk/three-d-secure/strategy/braintree';
import actionToken from '../../../server/fixtures/tokens/action-token-braintree.json';
import Promise from 'promise';

describe.only('BraintreeStrategy', function () {
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
    this.braintree = {
      client: {
        create: sinon.stub().resolves(
          sinon.stub().resolves(this.braintree)
        )
      },
      verifyCard: sinon.stub().resolves(this.exampleResult)
    };
    window.Braintree = sinon.spy(publicKey => this.braintree);

    this.strategy = new BraintreeStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { isIE, sandbox } = this;
    sandbox.restore();
    delete window.Braintree;
    if (isIE) delete window.Promise;
  });

  it('instantiates Braintree.js with the Braintree public key', function (done) {
    const { strategy } = this;
    strategy.whenReady(() => {
      assert(window.Braintree.calledOnce);
      assert(window.Braintree.calledWithExactly('test-braintree-public-key'));
      done();
    });
  });

  describe('when the braintree.js library encounters a load error', function () {
    beforeEach(function () {
      const { sandbox, threeDSecure } = this;
      sandbox.replace(BraintreeStrategy.prototype, 'urlForResource', (f) => '/api/mock-404');
      delete window.Braintree;
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
    it('instructs Braintree.js to handle the card action using the client secret', function (done) {
      const { strategy, target, braintree } = this;
      strategy.attach(target);
      assert(braintree.verifyCard.calledOnce);
      assert(braintree.verifyCard.calledWithExactly({
        amount: 5000,
        nonce: "test-braintree-nonce",
        bin: "test-braintree-bin",
        onLookupComplete: sinon.match.func
      }));
      done();
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
        strategy.braintree.verifyCard = sinon.stub().rejects(this.exampleResult);
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
