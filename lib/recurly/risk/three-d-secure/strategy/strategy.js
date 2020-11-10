import ReadinessEmitter from '../../../../util/readiness-emitter';

export default class ThreeDSecureStrategy extends ReadinessEmitter {
  static strategyName = 'base';

  static preflight () {}
  static PREFLIGHT_TIMEOUT = 30000;

  constructor ({ threeDSecure, actionToken }) {
    super();
    this.threeDSecure = threeDSecure;
    this.actionToken = actionToken;
  }

  get strategyName () {
    return this.constructor.strategyName;
  }

  get container () {
    if (this._container) return this._container;
    const { parent } = this;
    // eslint-disable-next-line
    if (!parent) return;
    const container = this._container = document.createElement('div');
    container.setAttribute('data-recurly', 'three-d-secure-container');
    container.style.height = '100%';
    container.style.width = '100%';
    parent.appendChild(container);
    return container;
  }

  attach (el) {
    this.parent = el;
  }

  remove () {
    if (!this._container) return;
    if (!this._container.parentElement) return;
    this.parent.removeChild(this._container);
  }

  fingerprint () {}

  challenge () {}
}
