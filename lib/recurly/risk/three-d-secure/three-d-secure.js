import AdyenStrategy from './strategy/adyen';
import errors from '../../errors';
import Promise from 'promise';
import RiskConcern from '../risk-concern';
import StripeStrategy from './strategy/stripe';
import TestStrategy from './strategy/test';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure');

export function factory (options) {
  return new ThreeDSecureConcern({ risk: this, ...options });
}

/**
 * 3D Secure 2.0
 *
 * Usage
 *
 * ```
 * const risk = recurly.Risk();
 * const threeDSecure = risk.ThreeDSecure({ actionTokenId: 'my-action-token-id' });
 *
 * threeDSecure.on('done', token => token);
 * threeDSecure.on('error', err => err);
 *
 * threeDSecure.attach(document.querySelector('#my-checkout-form'));
 * ```
 *
 * @param {Risk} risk
 * @param {String} [actionTokenId] when given, the concern will parse any auth actions
 *                                 necessary to fulfull the action
 */
class ThreeDSecureConcern extends RiskConcern {
  static STRATEGY_MAP = {
    adyen: AdyenStrategy,
    stripe: StripeStrategy,
    test: TestStrategy
  };

  constructor ({ risk, actionTokenId }) {
    super({ risk });

    this.actionTokenId = actionTokenId;

    if (actionTokenId) {
      this.recurly.request.get({ route: `/tokens/${actionTokenId}` })
        .catch(err => this.error(err))
        .then(token => {
          assertIsActionToken(token);
          this.strategy = this.getStrategyForActionToken(token);
          this.strategy.on('done', (...args) => this.onStrategyDone(...args));
          this.markReady();
        })
        .catch(err => this.error(err))
        .done();
    } else {
      // The base class acts as a null strategy
      this.strategy = new ThreeDSecureStrategy;
      this.markReady();
    }
  }

  /**
   * Instructs the strategy to attach, awaiting readiness of the strategy
   *
   * @param {HTMLElement} container
   */
  attach (container) {
    this.whenReady(() => this.strategy.attach(container));
  }

  remove () {
    this.whenReady(() => this.strategy.remove());
  }

  /**
   * Determines which strategy to employ based on an ThreeDSecureActionToken
   *
   * @private
   * @param {Object} actionToken
   */
  getStrategyForActionToken (actionToken) {
    const strategy = this.constructor.STRATEGY_MAP[actionToken.gateway.type];
    const threeDSecure = this;
    return new strategy({ threeDSecure, actionToken });
  }

  /**
   * Creates a ThreeDSecureActionResultToken from action results
   *
   * @private
   * @param {Object} results
   * @param {Function} done callback
   * @return {Promise} to create the token
   */
  createResultToken (results) {
    const data = {
      type: 'three_d_secure_action_result',
      three_d_secure_action_token_id: this.actionTokenId,
      results
    };
    debug('submitting results for tokenization', data);
    return this.recurly.request.post({ route: '/tokens', data });
  }

  // Listeners

  /**
   * Called when a strategy has produced results
   *
   * @param {Object} results
   */
  onStrategyDone (results) {
    this.createResultToken(results)
      .catch(cause => this.error('3ds-result-tokenization-error', { cause }))
      .then(token => {
        debug('Result token', token);
        this.emit('token', token);
      })
      .done();
  }
}

function assertIsActionToken (token) {
  if (token && token.type === 'three_d_secure_action') return;
  throw errors('invalid-option', { name: 'actionTokenId', expect: 'a three_d_secure_action_token_id' });
}
