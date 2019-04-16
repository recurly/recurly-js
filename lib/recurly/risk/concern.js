import Emitter from 'component-emitter';

export default class RiskConcern extends Emitter {
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

  error (err) {
    this.emit('error', err);
    throw err;
  }

  destroy () {
    this.remove();
    this.risk.remove(this);
    this.off();
  }
}
