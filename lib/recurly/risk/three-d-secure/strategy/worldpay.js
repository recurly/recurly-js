import errors from '../../../errors';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:worldpay');

export default class WorldpayStrategy extends ThreeDSecureStrategy {
  static strategyName = 'worldpay';

  /**
   * Performs Worldpay data collector preflight
   *
   * @param {recurly} options.recurly
   * @param {String} options.bin CC BIN
   * @param {String} options.jwt JWT
   * @return {Promise}
   */
  static preflight ({ recurly, number, jwt }) {
    const { PREFLIGHT_TIMEOUT } = WorldpayStrategy;
    const bin = number.substr(0, 6);
    const frame = recurly.Frame({
      path: '/risk/data_collector',
      payload: {
        bin,
        jwt,
        redirect_url: 'https://secure-test.worldpay.com/shopper/3ds/ddc.html'
      },
      container: window.document.body,
      type: Frame.TYPES.IFRAME,
      height: 0,
      width: 0
    });

    return Promise.race([new Promise(resolve => {
      const listener = ({ data }) => {
        try {
          const body = JSON.parse(data);
          if (body.MessageType === 'profile.completed') {
            debug('received device data session id', body);
            resolve({ session_id: body.SessionId });
            recurly.bus.off('raw-message', listener);
            frame.destroy();
          }
        } catch (e) {
          debug('Error parsing message. May be foreign message, skipping', e);
        }
      };
      recurly.bus.on('raw-message', listener);
    }), new Promise(resolve => {
      setTimeout(() => {
        resolve(errors('risk-preflight-timeout', { processor: 'worldpay' }));
      }, PREFLIGHT_TIMEOUT);
    })]);
  }

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  get redirectUrl () {
    return this.actionToken.three_d_secure.params.redirect_url;
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

    const { actionToken, container, threeDSecure, redirectUrl } = this;
    const { recurly } = threeDSecure.risk;

    const payload = {
      redirect_url: redirectUrl,
      three_d_secure_action_token_id: actionToken.id
    };

    this.frame = recurly.Frame({ path: '/three_d_secure/start', type: Frame.TYPES.IFRAME, payload, container })
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
