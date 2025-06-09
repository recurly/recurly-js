import assert from 'assert';
import { applyFixtures } from '../../support/fixtures';
import { testBed } from '../../support/helpers';
import ThreeDSecureStrategy from '../../../../lib/recurly/risk/three-d-secure/strategy';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-test.json';
import { ThreeDSecure } from '../../../../lib/recurly/risk/three-d-secure';

describe('ThreeDSecureStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function () {
    const threeDSecure = this.threeDSecureStub = sinon.stub();
    this.strategy = new ThreeDSecureStrategy({ threeDSecure, actionToken });
    this.target = testBed().querySelector('#three-d-secure-container');
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

      it('is a div element', function () {
        const { container } = this.strategy;
        assert(container instanceof HTMLDivElement);
      });

      it('has a data-recurly attribute', function () {
        const { container } = this.strategy;
        assert.strictEqual(container.getAttribute('data-recurly'), 'three-d-secure-container');
      });

      describe('dimensions', function () {
        it('sets its height and width to 100% when no challengeWindowSize is given', function () {
          const { container } = this.strategy;
          assert.strictEqual(container.style.height, '100%');
          assert.strictEqual(container.style.width, '100%');
        });

        it('sets the height and width to the given challengeWindowSize', function () {
          const challengeWindowSize = ThreeDSecure.CHALLENGE_WINDOW_SIZE_01_250_X_400;
          const threeDSecure = this.threeDSecureStub;
          threeDSecure.challengeWindowSize = challengeWindowSize;

          const strategy = new ThreeDSecureStrategy({ threeDSecure, actionToken });
          strategy.attach(this.target);
          const { container } = strategy;

          assert.strictEqual(container.style.width, '250px');
          assert.strictEqual(container.style.height, '400px');
        });
      });

      it('is a single child of the target element', function () {
        const { strategy, target } = this;
        strategy.container;
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
