import assert from 'assert';
import Promise from 'promise';
import errors from '../../lib/recurly/errors';
import { initRecurly } from './support/helpers';
import { factory, Risk } from '../../lib/recurly/risk';
import RiskConcern from '../../lib/recurly/risk/risk-concern';
import { ThreeDSecure } from '../../lib/recurly/risk/three-d-secure/three-d-secure';

describe('Risk', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.risk = this.recurly.Risk();
    this.sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
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
      const { sandbox } = this;
      sandbox.stub(navigator, 'language').get(() => 'fake-language');
      sandbox.stub(navigator, 'javaEnabled').callsFake(() => 'fake-java-enabled');
      sandbox.stub(screen, 'colorDepth').get(() => 'fake-color-depth');
      sandbox.stub(screen, 'height').get(() => 'fake-height');
      sandbox.stub(screen, 'width').get(() => 'fake-width');
      sandbox.stub(Date.prototype, 'getTimezoneOffset').callsFake(() => 'fake-timezone-offset');
    });

    it('returns an object containing risk-related browser info', function () {
      const browserInfo = Risk.browserInfo;
      assert.deepStrictEqual(Object.keys(browserInfo), [
        'color_depth',
        'java_enabled',
        'language',
        'referrer_url',
        'screen_height',
        'screen_width',
        'time_zone_offset',
        'user_agent'
      ]);

      assert.strictEqual(browserInfo.color_depth, 'fake-color-depth');
      assert.strictEqual(browserInfo.java_enabled, 'fake-java-enabled');
      assert.strictEqual(browserInfo.language, 'fake-language');
      assert.strictEqual(browserInfo.referrer_url, location.href);
      assert.strictEqual(browserInfo.screen_height, 'fake-height');
      assert.strictEqual(browserInfo.screen_width, 'fake-width');
      assert.strictEqual(browserInfo.time_zone_offset, 'fake-timezone-offset');
      assert.strictEqual(browserInfo.user_agent, navigator.userAgent);
    });
  });

  describe('Risk.preflight', function () {
    beforeEach(function () {
      const { sandbox } = this;
      this.bin = '411111';
      this.recurly = initRecurly({ publicKey: 'test-preflight-key' });
      this.stubPreflightResults = { risk: [{ arbitrary: 'results' }], tokenType: undefined };
      sandbox.stub(ThreeDSecure, 'preflight').usingPromise(Promise).resolves(this.stubPreflightResults);
    });

    afterEach(function () {
      this.recurly.destroy();
    });

    it('retrieves preflight parameters from the API and resolves with results', function (done) {
      const { recurly, sandbox, bin, stubPreflightResults } = this;
      sandbox.spy(recurly.request, 'get');
      Risk.preflight({ recurly, bin })
        .done(results => {
          assert(recurly.request.get.calledOnce);
          assert(recurly.request.get.calledWithMatch({ route: '/risk/preflights' }));
          assert.deepStrictEqual(results, stubPreflightResults);
          done();
        });
    });

    describe('when some results are timeouts', function () {
      beforeEach(function () {
        this.stubPreflightResults = { risk: [
          { arbitrary: 'preflight-results' },
          errors('risk-preflight-timeout', { processor: 'test' }),
          { arbitrary: 'preflight-results-2' },
          errors('risk-preflight-timeout', { processor: 'test-2' })
        ], tokenType: undefined };
        ThreeDSecure.preflight.usingPromise(Promise).resolves(this.stubPreflightResults);
      });

      it('filters out those timeout results', function (done) {
        const { recurly, bin, stubPreflightResults } = this;
        Risk.preflight({ recurly, bin })
          .done(results => {
            assert.strictEqual(results.risk.length, 2);
            assert.deepStrictEqual(results.risk[0], stubPreflightResults.risk[0]);
            assert.deepStrictEqual(results.risk[1], stubPreflightResults.risk[2]);
            done();
          });
      });
    });
  });

  describe('ThreeDSecure', function () {
    it('functions as a factory for ThreeDSecure', function () {
      const { risk } = this;
      const threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
      assert.strictEqual(threeDSecure instanceof ThreeDSecure, true);
    });

    it('adds the new instance to Risk.concerns', function () {
      const { risk } = this;
      assert.strictEqual(risk.concerns.length, 0);
      const threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
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
        class Example extends RiskConcern {}
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
