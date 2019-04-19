import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const SCRIPT_URL = 'https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/2.2.0/adyen.js';

export default class AdyenStrategy extends ThreeDSecureStrategy {
  constructor ({ threeDSecure, actionToken }) {
    this.threeDSecure = threeDSecure;
    this.actionToken = actionToken;

    this.loadAdyenLibrary()
      .then(() => {
        this.adyenCheckout = new AdyenCheckout();
        this.emit('ready');
      })
      .catch(err => {
        this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Adyen', cause: err });
      })
      .done();
  }

  get shouldFingerprint () {
    return !!this.adyenFingerprintToken;
  }

  get shouldChallenge () {
    return !!this.adyenChallengeToken;
  }

  get adyenFingerprintToken () {
    return this.actionToken.gatewayData['threeds2.fingerprintToken'];
  }

  get adyenChallengeToken () {
    return this.actionToken.gatewayData['threeds2.challengeToken'];
  }

  get innerContainer () {
    if (this._innerContainer) return this._innerContainer;
    const innerContainer = this._innerContainer = document.createElement('div');
    innerContainer.setAttribute('data-recurly', 'three-d-secure-adyen-container');
    this.container.appendChild(innerContainer);
    return innerContainer;
  }

  /**
   * Provides the target DOM container for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} container
   */
  attach (container) {
    super.attach(container);

    const { shouldFingerprint, shouldChallenge } = this;

    if (shouldFingerprint) {
      this.whenReady(() => this.fingerprint());
    } else if (shouldChallenge) {
      this.whenReady(() => this.challenge());
    }
  }

  /**
   * Initiates device fingerprinting through AdyenCheckout
   */
  fingerprint () {
    const { adyenCheckout, adyenFingerprintToken, innerContainer } = this;

    adyenCheckout.create('threeDS2DeviceFingerprint', {
      fingerprintToken: adyenFingerprintToken,
      onComplete: results => this.emit('done', results),
      onError: cause => this.threeDSecure.error('3ds-fingerprint-error', { gateway: 'Adyen', cause }),
    });

    adyenCheckout.mount(innerContainer);
  }

  /**
   * Initiates a challenge through AdyenCheckout
   */
  challenge () {
    const { adyenCheckout, adyenChallengeToken, innerContainer } = this;

    adyenCheckout.create('threeDS2Challenge', {
      challengeToken: adyenChallengeToken,
      onComplete: results => this.emit('done', results),
      onError: cause => this.threeDSecure.error('3ds-challenge-error', { gateway: 'Adyen', cause }),
      size: '05'
    });

    adyenCheckout.mount(innerContainer);
  }

  /**
   * Loads Adyen library dependency
   */
  loadAdyenLibrary (done) {
    return new Promise((resolve, reject) => {
      if (AdyenCheckout) resolve();
      else return Promise.denodeify(loadScript)(SCRIPT_URL);
    });
  }
}
