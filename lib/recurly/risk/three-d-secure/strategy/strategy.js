import ReadinessEmitter from '../../../../util/readiness-emitter';

export default class ThreeDSecureStrategy extends ReadinessEmitter {
  static strategyName = 'base';

  static preflight () {}
  static PREFLIGHT_TIMEOUT = 30000;
  static FRAME_DIMENSIONS = {
    '01': { height: '400px', width: '250px' },
    '02': { height: '400px', width: '390px' },
    '03': { height: '600px', width: '500px' },
    '04': { height: '400px', width: '600px' },
    '05': { height: '100%', width: '100%' }
  }

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

    const { parent, threeDSecure: { risk: { recurly: { config: { challengeWindowSize } } } } } = this;
    const frameDimensions = this.constructor.FRAME_DIMENSIONS;
    const selectedWindowSize = frameDimensions[challengeWindowSize];
    if (!selectedWindowSize) {
      const validWindowSizes = Object.keys(frameDimensions).join(', ');
      throw new Error(`Invalid challengeWindowSize. Expected any of ${validWindowSizes}, got ${challengeWindowSize}`);
    }

    // eslint-disable-next-line
    if (!parent) return;
    const container = this._container = document.createElement('div');
    container.setAttribute('data-recurly', 'three-d-secure-container');
    container.style.height = selectedWindowSize.height;
    container.style.width = selectedWindowSize.width;
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
