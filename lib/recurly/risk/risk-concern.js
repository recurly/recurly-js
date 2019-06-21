import errors from '../errors';
import ReadinessEmitter from '../../util/readiness-emitter';
import uid from '../../util/uid';

/**
 * Risk concern management class
 *
 * @abstract
 */
export default class RiskConcern extends ReadinessEmitter {
  concernName = 'base';

  constructor ({ risk }) {
    super();
    this.id = uid();
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
  }

  report (name, meta) {
    const { risk, id: concernId, concernName } = this;
    risk.recurly.report(`${concernName}:${name}`, { concernId, ...meta });
  }

  destroy () {
    this.remove();
    this.risk.remove(this);
    this.off();
  }
}
