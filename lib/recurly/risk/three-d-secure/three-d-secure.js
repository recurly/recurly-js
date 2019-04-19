import AdyenStrategy from './strategy/adyen';
import Promise from 'promise';
import RiskConcern from '../risk-concern';
import ThreeDSecureStrategy from './strategy';

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
  constructor ({ risk, actionTokenId }) {
    super({ risk });

    if (actionTokenId) {
      this.recurly.request.get({ route: `/token/${actionTokenId}` }, (err, token) => {
        if (err) return this.error(err);
        this.strategy = this.getStrategyForActionToken(token);
        this.strategy.on('done', (...args) => this.onStrategyDone(...args));
        this.markReady();
      });
    } else {
      // The base class acts as a null strategy
      this.strategy = new ThreeDSecureStrategy();
      this.markReady();
    }
  }

  /**
   * Returns a set of values helpful for building a risk profile
   *
   * @typedef {Object} BrowserInfo
   * @property {Number} colorDepth
   * @property {Boolean} javaEnabled
   * @property {String} language
   * @property {Number} screenHeight
   * @property {Number} screenWidth
   * @property {Number} timeZoneOffset
   * @property {String} userAgent
   *
   * @return {BrowserInfo}
   */
  get browserInfo () {
    if (this._browserInfo) return this._browserInfo;

    const { navigator, screen } = window;
    const { language, userAgent } = navigator;
    const { colorDepth } = screen;

    return this._browserInfo = {
      colorDepth,
      javaEnabled: navigator.javaEnabled(),
      language,
      screenHeight: screen.height,
      screenWidth: screen.width,
      timeZoneOffset: (new Date()).getTimezoneOffset(),
      userAgent
    };
  }

  /**
   * Instructs the strategy to attach, awaiting readiness of the strategy
   *
   * @param {HTMLElement} container
   */
  attach (container) {
    this.whenReady(() => this.strategy.attach(container));
  }

  /**
   * Determines which strategy to employ based on an ThreeDSecureActionToken
   *
   * TODO:
   *  - For now we are scaffolding with just the AdyenStrategy.
   *  - Later, we will parse the actionToken to determine the strategy to use
   *
   * @private
   * @param {Object} actionToken
   */
  getStrategyForActionToken (actionToken) {
    return new AdyenStrategy({ threeDSecure: this, actionToken });
  }

  /**
   * Creates a ThreeDSecureActionResultToken from action results
   *
   * @private
   * @param {Object} results
   * @param {Function} done callback
   * @return {Promise} to create the token
   */
  createResultToken (results, done) {
    return new Promise((resolve, reject) => {
      this.recurly.request.post({ route: '/token', data: {
        tokenType: 'ThreeDSecureActionResultToken',
        actionRequestTokenId: this.actionTokenId,
        results
      }, done});
    });
  }

  // Listeners

  /**
   * Called when a strategy has produced results
   *
   * @param {Object} results
   */
  onStrategyDone (results) {
    this.createResultToken(results, (err, token) => {
      if (err) return this.error('3ds-result-tokenization-error', { cause: err });
      this.emit('done', token);
    });
  }
}
