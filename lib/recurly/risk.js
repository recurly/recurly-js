import Emitter from 'component-emitter';
import { factory as ThreeDSecure } from './risk/three-d-secure';

export function factory (options) {
  return new Risk({ recurly: this, ...options });
}

/**
 * Risk concerns controller
 */
class Risk extends Emitter {
  ThreeDSecure = ThreeDSecure;

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

  /**
   * Instructs concerns to attach to a DOM target
   * @param {HTMLElement} container
   */
  attach (container) {
    if (!(container instanceof HTMLElement)) {
      throw 'Invalid container. Expected HTMLElement.';
    }

    this.container = container;
    this.concerns.forEach(concern => concern.attach(container));
  }
}