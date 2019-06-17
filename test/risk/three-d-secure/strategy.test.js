import assert from 'assert';
import { applyFixtures } from '../../support/fixtures';
import { testBed } from '../../support/helpers';
import ThreeDSecureStrategy from '../../../lib/recurly/risk/three-d-secure/strategy';
import actionToken from '../../server/fixtures/tokens/test-action-token-id.json';

describe('ThreeDSecureStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function () {
    const sandbox = this.sandbox = sinon.createSandbox();
    const threeDSecure = this.threeDSecureStub = sandbox.stub();
    this.strategy = new ThreeDSecureStrategy({ threeDSecure, actionToken });
    this.target = testBed().querySelector('#three-d-secure-container');
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('attach', function () {
    it('assigns the given element to parent', function () {
      const { strategy, target } = this;
      assert.strictEqual(strategy.parent, undefined);
      strategy.attach(target);
      assert.strictEqual(strategy.parent, target);
    });
  });

  describe('container', function () {
    describe('when attached', function () {
      beforeEach(function () {
        const { strategy, target } = this;
        strategy.attach(target);
      });

      it('returns a container div element', function () {
        const { strategy } = this;
        assert(strategy.container instanceof HTMLDivElement);
        assert.strictEqual(strategy.container.getAttribute('data-recurly'), 'three-d-secure-container');
      });

      it('is a single child of the target element', function () {
        const { strategy, target } = this;
        assert.strictEqual(strategy.container, target.children[0]);
        assert.strictEqual(target.children.length, 1);
      });
    });

    describe('when not attached', function () {
      it('returns undefined', function () {
        const { strategy } = this;
        assert.strictEqual(strategy.container, undefined);
      });

      it('retains an empty target element', function () {
        const { target } = this;
        assert.strictEqual(target.children.length, 0);
      });
    });
  });

  describe('remove', function () {
    describe('when the strategy is attached', function () {
      beforeEach(function () {
        const { strategy, target } = this;
        strategy.attach(target);
        strategy.container;
      });

      it('removes the container', function () {
        const { strategy, target } = this;
        assert.strictEqual(target.children.length, 1);
        assert.strictEqual(target.children[0], strategy.container);
        strategy.remove();
        assert.strictEqual(target.children.length, 0);
      });
    });

    describe('when the strategy is not attached', function () {
      it('does nothing', function () {
        const { target } = this;
        assert.strictEqual(target.children.length, 0);
      });
    });
  });
});
