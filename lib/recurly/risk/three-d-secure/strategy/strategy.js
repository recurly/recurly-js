import ReadinessEmitter from '../../../../util/readiness-emitter';
import { ThreeDSecure } from '../three-d-secure';

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

    const {
      CHALLENGE_WINDOW_SIZE_DEFAULT: challengeWindowSizeDefault,
      CHALLENGE_WINDOW_SIZE_DIMENSIONS: challengeWindowSizeDimensions,
    } = ThreeDSecure;

    const challengeWindowSize = this.threeDSecure?.challengeWindowSize || challengeWindowSizeDefault;
    const selectedChallengeDimensions = challengeWindowSizeDimensions[challengeWindowSize];

    // eslint-disable-next-line
    if (!parent) return;
    const container = this._container = document.createElement('div');
    container.setAttribute('data-recurly', 'three-d-secure-container');
    container.style.height = selectedChallengeDimensions.height;
    container.style.width = selectedChallengeDimensions.width;
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
