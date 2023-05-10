import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:paypalcomplete');

export default class PayPalCompleteStrategy extends ThreeDSecureStrategy {
  static strategyName = 'paypal_commerce';

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  get redirectParams () {
    return this.actionToken.three_d_secure.params;
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

    const {
      threeDSecure,
      container,
      redirectParams: { redirect: { url: approveURL } } ,
    } = this;
    const { recurly } = this.threeDSecure.risk;
    const { config: { publicKey } } = recurly;
    const defaultEventName = 'paypalcomplete-3ds-challenge';

    const finishURL = recurly.url(`/three_d_secure/finish?key=${publicKey}&event=${defaultEventName}`);
    const approveURLWithRedirect = `${approveURL}&redirect_uri=${encodeURIComponent(finishURL)}`;

    const payload = {
      redirect_url: approveURLWithRedirect,
      three_d_secure_action_token_id: this.actionToken.id
    };

    this.frame = recurly.Frame({
      path: '/three_d_secure/start',
      payload,
      container,
      type: Frame.TYPES.IFRAME,
      defaultEventName,
    }).on('error', cause => threeDSecure.error('3ds-auth-error', { cause }))
      .on('done', results => {
        if (results.liability_shift === 'POSSIBLE') {
          this.emit('done', results);
        } else {
          threeDSecure.error('3ds-auth-error', { cause: 'Liability shift not possible' });
        }
      });
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
