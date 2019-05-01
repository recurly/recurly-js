import ReadinessEmitter from '../../../../util/readiness-emitter';

export default class ThreeDSecureStrategy extends ReadinessEmitter {
  constructor ({ threeDSecure, actionToken }) {
    super();
    this.threeDSecure = threeDSecure;
    this.actionToken = actionToken;
  }

  get container () {
    if (this._container) return this._container;
    const container = this._container = document.createElement('div');
    container.setAttribute('data-recurly', 'three-d-secure-container');
    this.parent.appendChild(container);
    return container;
  }

  attach (el) {
    this.parent = el
  }

  remove () {
    if (!this._container.parentElement) return;
    this.parent.removeChild(this._container);
  }

  fingerprint () {}

  challenge () {}
}
