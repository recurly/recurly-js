import AdyenStrategy from './strategy/adyen';
import BraintreeStrategy from './strategy/braintree';
import CybersourceStrategy from './strategy/cybersource';
import errors from '../../errors';
import find from 'component-find';
import Promise from 'promise';
import RiskConcern from '../risk-concern';
import SagePayStrategy from './strategy/sage-pay';
import StripeStrategy from './strategy/stripe';
import TestStrategy from './strategy/test';
import WirecardStrategy from './strategy/wirecard';
import WorldpayStrategy from './strategy/worldpay';
import OrbitalStrategy from './strategy/orbital';
import PayPalCompleteStrategy from './strategy/paypal-complete';
import AmazonStrategy from './strategy/amazon';

const debug = require('debug')('recurly:risk:three-d-secure');

export function factory (options) {
  return new ThreeDSecure({ risk: this, ...options });
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
 * threeDSecure.on('token', token => token);
 * threeDSecure.on('error', err => err);
 *
 * threeDSecure.attach(document.querySelector('#my-checkout-3ds-container'));
 * ```
 *
 * @param {Risk} risk
 * @param {String} [actionTokenId] when given, the concern will parse any auth actions
 *                                 necessary to fulfull the action
 */
export class ThreeDSecure extends RiskConcern {
  concernName = 'three-d-secure';

  static STRATEGIES = [
    AdyenStrategy,
    BraintreeStrategy,
    CybersourceStrategy,
    SagePayStrategy,
    StripeStrategy,
    TestStrategy,
    WirecardStrategy,
    WorldpayStrategy,
    OrbitalStrategy,
    PayPalCompleteStrategy,
    AmazonStrategy,
  ];

  static CHALLENGE_WINDOW_SIZE_01_250_X_400 = '01';
  static CHALLENGE_WINDOW_SIZE_02_390_X_400 = '02';
  static CHALLENGE_WINDOW_SIZE_03_500_X_600 = '03';
  static CHALLENGE_WINDOW_SIZE_04_600_X_400 = '04';
  static CHALLENGE_WINDOW_SIZE_05_FULL_SCREEN = '05';
  static CHALLENGE_WINDOW_SIZE_DEFAULT = this.CHALLENGE_WINDOW_SIZE_05_FULL_SCREEN;

  static CHALLENGE_WINDOW_SIZE_DIMENSIONS = {
    '01': { height: '400px', width: '250px' },
    '02': { height: '400px', width: '390px' },
    '03': { height: '600px', width: '500px' },
    '04': { height: '400px', width: '600px' },
    '05': { height: '100%', width: '100%' }
  }

  static VALID_ACTION_TOKEN_TYPES = [
    'three_d_secure_action',
    'three_d_secure_proactive_action'
  ];

  /**
   * Returns a strateggy for a given gateway type
   *
   * @param  {String} type
   * @return {ThreeDSecureStrategy}
   */
  static getStrategyForGatewayType (type) {
    return find(ThreeDSecure.STRATEGIES, s => s.strategyName === type);
  }

  /**
   * Performs preflight procedures per strategy
   *
   * @typedef  {Object} Preflights
   * @property {Object} gateway
   * @property {String} gateway.type  e.g. 'worldpay'
   * @property {Object} params        params required by the strategy
   *
   * @param {Recurly}    options.recurly
   * @param {String}     options.bin         credit card BIN
   * @param {Preflights} options.preflights
   * @return {Promise}
   */
  static preflight ({ recurly, number, month, year, cvv, preflights, addressFields }) {
    return preflights.reduce((preflight, result) => {
      return preflight.then((finishedPreflights) => {
        const { type: gatewayType } = result.gateway;
        const { gateway_code } = result.params;
        const strategy = ThreeDSecure.getStrategyForGatewayType(gatewayType);
        return strategy.preflight({ recurly, number, month, year, cvv, addressFields, ...result.params })
          .then((preflightResponse) => {
            if (!preflightResponse) return finishedPreflights;
            const { results, tokenType } = preflightResponse;
            return { 
              tokenType: finishedPreflights.tokenType || tokenType,
              risk: finishedPreflights.risk.concat({
                processor: gatewayType, 
                gateway_code, 
                results
              })
            };
          });
      });
    }, Promise.resolve({ risk: [] }));
  }

  constructor ({ risk, actionTokenId, challengeWindowSize }) {
    const existingConcern = risk.concerns.find((concern) => concern instanceof ThreeDSecure);
    if (existingConcern) {
      throw errors('3ds-multiple-instances', { name: 'ThreeDSecure', expect: 'to be the only concern' });
    }

    super({ risk });

    this.actionTokenId = actionTokenId;

    this.validateChallengeWindowSize(challengeWindowSize);
    this.challengeWindowSize = challengeWindowSize || this.constructor.CHALLENGE_WINDOW_SIZE_DEFAULT;

    if (!actionTokenId) {
      throw errors('invalid-option', { name: 'actionTokenId', expect: 'a three_d_secure_action_token_id' });
    }

    this.recurly.request.get({ route: `/tokens/${actionTokenId}` })
      .catch(err => this.error(err))
      .then(token => {
        assertIsActionToken(token);
        this.strategy = this.getStrategyForActionToken(token);
        this.strategy.on('done', (...args) => this.onStrategyDone(...args));
        this.markReady();
      })
      .catch(err => this.error(err));

    this.report('create', { actionTokenId });
    this.whenReady(() => this.report('ready', { strategy: this.strategy.strategyName }));
  }

  /**
   * Instructs the strategy to attach, awaiting readiness of the strategy
   *
   * @param {HTMLElement} container
   */
  attach (container) {
    this.whenReady(() => {
      this.strategy.attach(container);
      this.report('attach');
    });
  }

  remove () {
    this.whenReady(() => {
      this.strategy.remove();
      this.report('remove');
    });
  }

  /**
   * Determines which strategy to employ based on an ThreeDSecureActionToken
   *
   * @private
   * @param {Object} actionToken
   */
  getStrategyForActionToken (actionToken) {
    const strategy = ThreeDSecure.getStrategyForGatewayType(actionToken.gateway.type);
    return new strategy({ threeDSecure: this, actionToken });
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
        this.report('done', { actionResultTokenId: token.id });
      })
      .done();
  }

  validateChallengeWindowSize (challengeWindowSize) {
    if (!challengeWindowSize) {
      return;
    }

    const validWindowSizes = Object.keys(this.constructor.CHALLENGE_WINDOW_SIZE_DIMENSIONS);

    if (!~validWindowSizes.indexOf(challengeWindowSize)) {
      throw new Error(`Invalid challengeWindowSize. Expected any of ${validWindowSizes}, got ${challengeWindowSize}`);
    }
  }
}

function assertIsActionToken (token) {
  if (ThreeDSecure.VALID_ACTION_TOKEN_TYPES.includes(token?.type)) return;

  throw errors('invalid-option', {
    name: 'actionTokenId',
    expect: `a token of type: ${ThreeDSecure.VALID_ACTION_TOKEN_TYPES.join(',')}`
  });
}
