import RiskConcern from './risk-concern';
import { ThreeDSecure, factory as threeDSecureFactory } from './three-d-secure';

const debug = require('debug')('recurly:risk');

export function factory (options) {
  return new Risk({ recurly: this, ...options });
}

/**
 * Risk concerns controller
 */
export class Risk {
  ThreeDSecure = threeDSecureFactory;

  /**
   * Returns a set of values helpful for building a risk profile,
   * formatted for the API
   *
   * @typedef {Object} BrowserInfo
   * @property {Number} color_depth
   * @property {Boolean} java_enabled
   * @property {String} language
   * @property {Number} screen_height
   * @property {Number} screen_width
   * @property {Number} time_zone_offset
   * @property {String} user_agent
   *
   * @private
   * @return {BrowserInfo}
   */
  static get browserInfo () {
    const { navigator, screen } = window;
    const { language, userAgent: user_agent } = navigator;
    const { colorDepth: color_depth } = screen;

    return {
      color_depth,
      java_enabled: navigator.javaEnabled(),
      language,
      referrer_url: window.location.href,
      screen_height: screen.height,
      screen_width: screen.width,
      time_zone_offset: (new Date()).getTimezoneOffset(),
      user_agent
    };
  }

  /**
   * Retrieves preflight data and performs preflight procedures per concern
   *
   * Filters out any timeout results
   *
   * @param {Recurly} options.recurly
   * @param {String}  options.bin     credit card BIN
   * @return {Promise}
   */
  static preflight ({ recurly, number, month, year }) {
    return recurly.request.get({ route: '/risk/preflights' })
      .then(({ preflights }) => {
        debug('received preflight instructions', preflights);
        return ThreeDSecure.preflight({ recurly, number, month, year, preflights });
      })
      .then(results => results.filter(maybeErr => {
        if (maybeErr.code === 'risk-preflight-timeout') {
          debug('timeout encountered', maybeErr);
          return false;
        }
        return true;
      }));
  }

  constructor ({ recurly }) {
    this.recurly = recurly;
    this.concerns = [];
  }

  /**
   * Adds a risk concern to the controller
   *
   * @private
   * @param {RiskConcern} concern
   */
  add (concern) {
    if (!(concern instanceof RiskConcern)) {
      throw `Invalid concern. Expected 'RiskConcern', got '${typeof concern}'`;
    }
    this.concerns.push(concern);
  }

  /**
   * Removes a risk concern from the controller
   *
   * @private
   * @param {RiskConcern} concern
   * @return {Boolean} whether the removal was successful
   */
  remove (concern) {
    const { concerns } = this;
    const pos = concerns.indexOf(concern);
    const removed = ~pos && concerns.splice(pos, 1);
    return !!removed;
  }
}
