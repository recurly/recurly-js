import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:ebanx');

export default class EbanxStrategy extends ThreeDSecureStrategy {
  static strategyName = 'ebanx';

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  /**
   * Provides the target DOM element for which we will render
   * the redirect
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);
    debug('Initiating Ebanx Redirect frame');

    const { actionToken, container, threeDSecure } = this;
    const { recurly } = threeDSecure.risk;
    const { url, ...otherParams } = actionToken.three_d_secure.params;

    const payload = {
      redirect_url: url,
      three_d_secure_action_token_id: actionToken.id,
      ...otherParams
    };
    this.frame = recurly.Frame({ path: '/three_d_secure/start', type: Frame.TYPES.WINDOW, defaultEventName: 'ebanx-redirect', payload, container })
      .on('error', cause => threeDSecure.error('3ds-auth-error', { cause }))
      .on('done', results => this.emit('done', results));
  }

  /**
   * Removes DOM elements
   */
  remove () {
    const { frame } = this;
    if (frame) frame.destroy();
    super.remove();
  }
}
