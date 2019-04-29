import ThreeDSecure from './three-d-secure';

const debug = require('debug')('recurly:risk');

export function factory (options) {
  return new Risk({ recurly: this, ...options });
}

/**
 * Risk concerns controller
 */
export class Risk {
  ThreeDSecure = ThreeDSecure;

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
   * @private
   * @return {BrowserInfo}
   */
  static get browserInfo () {
    const { navigator, screen } = window;
    const { language, userAgent } = navigator;
    const { colorDepth } = screen;

    return {
      colorDepth,
      javaEnabled: navigator.javaEnabled(),
      language,
      referrerUrl: window.location.href,
      screenHeight: screen.height,
      screenWidth: screen.width,
      timeZoneOffset: (new Date()).getTimezoneOffset(),
      userAgent
    };
  }

  constructor ({ recurly }) {
    this.recurly = recurly;
    this.concerns = [];
  }

  /**
   * Adds a risk concern to the controller
   * @param {RiskConcern} concern
   */
  add (concern) {
    this.concerns.push(concern);
  }

  /**
   * Removes a risk concern from the controller
   * @param {RiskConcern} concern
   * @return {Boolean} whether the removal was successful
   */
  remove (concern) {
    const { concerns } = this;
    const pos = concerns.indexOf(concern);
    const removed = ~pos && concerns.splice(pos, 1);
    return removed;
  }
}
