import assert from 'assert';
import { initRecurly } from './support/helpers';
import { factory, Risk } from '../lib/recurly/risk';
import RiskConcern from '../lib/recurly/risk/risk-concern';
import { ThreeDSecureConcern } from '../lib/recurly/risk/three-d-secure/three-d-secure';

describe('Recurly.Risk', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.risk = this.recurly.Risk();
  });

  describe('factory', function () {
    it('returns a Risk instance', function () {
      assert.strictEqual(factory() instanceof Risk, true);
    });

    it('sets its Recurly reference from the calling context', function () {
      const stub = {};
      const risk = factory.call(stub);
      assert.strictEqual(risk.recurly, stub);
    });
  });

  describe('Risk.browserInfo', function () {
    beforeEach(function () {
      this.sandbox = sinon.createSandbox();
      this.sandbox.stub(navigator, 'language').get(() => 'fake-language');
      this.sandbox.stub(navigator, 'javaEnabled').callsFake(() => 'fake-java-enabled');
      this.sandbox.stub(navigator, 'userAgent').get(() => 'fake-user-agent');
      this.sandbox.stub(screen, 'colorDepth').get(() => 'fake-color-depth');
      this.sandbox.stub(screen, 'height').get(() => 'fake-height');
      this.sandbox.stub(screen, 'width').get(() => 'fake-width');
      this.sandbox.stub(Date.prototype, 'getTimezoneOffset').callsFake(() => 'fake-timezone-offset');
    });

    afterEach(function () {
      this.sandbox.restore();
    });

    it('returns an object containing risk-related browser info', function () {
      const browserInfo = Risk.browserInfo;
      assert.deepStrictEqual(Object.keys(browserInfo), [
        'colorDepth',
        'javaEnabled',
        'language',
        'referrerUrl',
        'screenHeight',
        'screenWidth',
        'timeZoneOffset',
        'userAgent'
      ]);

      assert.strictEqual(browserInfo.colorDepth, 'fake-color-depth');
      assert.strictEqual(browserInfo.javaEnabled, 'fake-java-enabled');
      assert.strictEqual(browserInfo.language, 'fake-language');
      assert.strictEqual(browserInfo.referrerUrl, location.href);
      assert.strictEqual(browserInfo.screenHeight, 'fake-height');
      assert.strictEqual(browserInfo.screenWidth, 'fake-width');
      assert.strictEqual(browserInfo.timeZoneOffset, 'fake-timezone-offset');
      assert.strictEqual(browserInfo.userAgent, 'fake-user-agent');
    });
  });

  describe('ThreeDSecure', function () {
    it('functions as a factory for ThreeDSecureConcern', function () {
      const { risk } = this;
      const threeDSecure = risk.ThreeDSecure();
      assert.strictEqual(threeDSecure instanceof ThreeDSecureConcern, true);
    });

    it('adds the new instance to Risk.concerns', function () {
      const { risk } = this;
      assert.strictEqual(risk.concerns.length, 0);
      const threeDSecure = risk.ThreeDSecure();
      assert.strictEqual(risk.concerns.length, 1);
      assert.strictEqual(risk.concerns[0], threeDSecure);
    });
  });

  describe('concern management', function () {
    beforeEach(function () {
      this.riskStub = { add: sinon.stub() };
      this.exampleRiskConcern = new RiskConcern({ risk: this.riskStub });
    });

    describe('add', function () {
      it('adds a RiskConcern', function () {
        const { risk, exampleRiskConcern } = this;
        risk.add(exampleRiskConcern);
        assert.strictEqual(risk.concerns.length, 1);
        assert.strictEqual(risk.concerns[0], exampleRiskConcern);
      });

      it('adds a RiskConcern inheritant', function () {
        const { risk, riskStub } = this;
        class Example extends RiskConcern {};
        const example = new Example({ risk: riskStub });
        risk.add(example);
        assert.strictEqual(risk.concerns.length, 1);
        assert.strictEqual(risk.concerns[0], example);
      });

      it('rejects non-RiskConcern objects', function () {
        const { risk } = this;
        const message = /Invalid concern. Expected 'RiskConcern', got '(\w+)'/;
        [undefined, 0, null, Infinity, window, {}].forEach(example => {
          assert.throws(() => risk.add(example), message);
        });
      });
    });

    describe('remove', function () {
      beforeEach(function () {
        this.exampleRiskConcernTwo = new RiskConcern({ risk: this.riskStub });
        this.risk.add(this.exampleRiskConcern);
      });

      it(`removes an existing and specified
          RiskConcern instance, returning true`, function () {
        const { risk, exampleRiskConcern, exampleRiskConcernTwo } = this;
        risk.add(this.exampleRiskConcernTwo);
        assert.strictEqual(risk.concerns.length, 2);
        assert.strictEqual(risk.concerns[0], exampleRiskConcern);
        assert.strictEqual(risk.concerns[1], exampleRiskConcernTwo);
        assert.strictEqual(risk.remove(exampleRiskConcern), true);
        assert.strictEqual(risk.concerns.length, 1);
        assert.strictEqual(risk.concerns[0], exampleRiskConcernTwo);
      });

      it(`does not remove a concern when the given concern
          does not exist, returning false`, function () {
        const { risk, exampleRiskConcern, exampleRiskConcernTwo } = this;
        [undefined, 0, null, Infinity, window, {}, exampleRiskConcernTwo].forEach(example => {
          assert.strictEqual(risk.concerns.length, 1);
          assert.strictEqual(risk.concerns[0], exampleRiskConcern);
          assert.strictEqual(risk.remove(example), false);
          assert.strictEqual(risk.concerns.length, 1);
          assert.strictEqual(risk.concerns[0], exampleRiskConcern);
        });
      });
    });
  });
});
