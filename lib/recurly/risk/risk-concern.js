import ReadinessEmitter from '../../../util/readiness-emitter';
import errors from '../errors';

/**
 * Risk concern management class
 */
export default class RiskConcern extends ReadinessEmitter {
  constructor ({ risk }) {
    this.risk = risk;
    this.risk.add(this);
  }

  get recurly () {
    return this.risk.recurly;
  }

  // To be implemented by individual concerns
  attach (container) {}
  remove () {}

  error (...args) {
    const err = errors(...args);
    this.emit('error', err);
    throw err;
  }

  destroy () {
    this.remove();
    this.risk.remove(this);
    this.off();
  }
}
