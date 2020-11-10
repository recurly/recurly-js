import errors from '../../../errors';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:cybersource');

export default class CybersourceStrategy extends ThreeDSecureStrategy {
  static strategyName = 'cybersource';

  static preflight ({ recurly, number, month, year, gateway_code }) {
    const { PREFLIGHT_TIMEOUT } = CybersourceStrategy;
    const data = {
      gatewayType: CybersourceStrategy.strategyName,
      gatewayCode: gateway_code,
      number,
      month,
      year,
    };

    return recurly.request.post({ route: '/risk/authentications', data })
      .then(({ jwt, deviceDataCollectionUrl }) => {
        const frame = recurly.Frame({
          path: '/risk/data_collector',
          payload: {
            jwt,
            redirect_url: deviceDataCollectionUrl
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
                frame.destroy();
                recurly.bus.off('raw-message', listener);
              }
            } catch (e) {
              debug('Error parsing message. May be foreign message, skipping', e);
            }
          };
          recurly.bus.on('raw-message', listener);
        }), new Promise(resolve => {
          setTimeout(() => {
            resolve(errors('risk-preflight-timeout', { processor: 'cybersource' }));
          }, PREFLIGHT_TIMEOUT);
        })]);
      });
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
      three_d_secure_action_token_id: actionToken.id,
      ...actionToken.three_d_secure.params
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
