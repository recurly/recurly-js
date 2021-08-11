import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:sage-pay');

export default class SagePayStrategy extends ThreeDSecureStrategy {
  static strategyName = 'sagepay';

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  get redirectParams () {
    return this.actionToken.three_d_secure.params;
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);
    debug('Initiating 3D Secure frame');

    const { redirectParams, container, threeDSecure } = this;
    const { recurly } = threeDSecure.risk;
    const payload = {
      redirect_url: redirectParams.acsUrl,
      pa_req: redirectParams.pareq,
      creq: redirectParams.creq,
      md: redirectParams.md,
      three_d_secure_action_token_id: this.actionToken.id
    };

    this.frame = recurly.Frame({
      path: '/three_d_secure/start',
      payload,
      container,
      type: Frame.TYPES.IFRAME,
      defaultEventName: 'sagepay-3ds-challenge'
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
