import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:adyen');
const LIB_URL = 'https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/2.2.0/adyen.js';

export default class AdyenStrategy extends ThreeDSecureStrategy {
  constructor (...args) {
    super(...args);

    debug('loading Adyen library');
    this.loadAdyenLibrary()
      .catch(err => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Adyen', cause: err }))
      .then(() => {
        this.adyenCheckout = new window.AdyenCheckout();
        debug('Adyen checkout instance created', this.adyenCheckout);
        this.markReady();
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
    return this.actionToken.three_d_secure_params.authentication['threeds2.fingerprintToken'];
  }

  get adyenChallengeToken () {
    return this.actionToken.three_d_secure_params.authentication['threeds2.challengeToken'];
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

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
    const { adyenCheckout, adyenFingerprintToken, container } = this;

    debug('Initializing fingerprinting with Adyen token', adyenFingerprintToken);

    const fingerprintService = adyenCheckout.create('threeDS2DeviceFingerprint', {
      fingerprintToken: adyenFingerprintToken,
      onComplete: results => this.emit('done', results),
      onError: cause => this.threeDSecure.error('3ds-fingerprint-error', { gateway: 'Adyen', cause }),
    });

    fingerprintService.mount(container);
  }

  /**
   * Initiates a challenge through AdyenCheckout
   */
  challenge () {
    const { adyenCheckout, adyenChallengeToken, container } = this;

    debug('Initializing challenge with Adyen token', adyenChallengeToken);

    const challengeService = adyenCheckout.create('threeDS2Challenge', {
      challengeToken: adyenChallengeToken,
      onComplete: results => this.emit('done', results),
      onError: cause => this.threeDSecure.error('3ds-challenge-error', { gateway: 'Adyen', cause }),
      size: '05'
    });

    challengeService.mount(container);
  }

  /**
   * Loads Adyen library dependency
   */
  loadAdyenLibrary (done) {
    return new Promise((resolve, reject) => {
      if (window.AdyenCheckout) return resolve();
      loadScript(LIB_URL, error => {
        if (error) reject(err);
        else resolve();
      })
    });
  }
}
