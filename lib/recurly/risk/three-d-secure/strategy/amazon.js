import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:amazon');

export default class AmazonStrategy extends ThreeDSecureStrategy {
  static strategyName = 'amazon';

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  get redirectParams () {
    return this.actionToken.three_d_secure.params.redirect;
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results.
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);
    debug('Initiating 3D Secure frame');

    const { redirectParams, container, threeDSecure } = this;
    const { recurly } = threeDSecure.risk;
    const payload = {
      redirect_url: redirectParams.url,
      three_d_secure_action_token_id: this.actionToken.id
    };

    this.frame = recurly.Frame({
      path: '/three_d_secure/start',
      payload,
      container,
      type: Frame.TYPES.WINDOW,
      defaultEventName: 'amazon-3ds-challenge'
    }).on('error', cause => threeDSecure.error('3ds-auth-error', { cause }))
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
