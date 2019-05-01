import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:adyen');
const LIB_URL = 'https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/2.2.0/adyen.js';

export default class AdyenStrategy extends ThreeDSecureStrategy {
  constructor (...args) {
    super(...args);

    if (!this.shouldLoadAdyenLibrary) return;
    debug('loading Adyen library');
    this.loadAdyenLibrary()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Adyen', cause }))
      .then(() => {
        this.adyenCheckout = new window.AdyenCheckout();
        debug('Adyen checkout instance created', this.adyenCheckout);
        this.markReady();
      })
      .done();
  }

  get shouldLoadAdyenLibrary () {
    return !this.shouldFallback;
  }

  get shouldFingerprint () {
    return !!this.adyenFingerprintToken;
  }

  get shouldChallenge () {
    return !!this.adyenChallengeToken;
  }

  get shouldFallback () {
    return !!this.adyenRedirectParams;
  }

  get adyenFingerprintToken () {
    const { authentication } = this.actionToken.three_d_secure.params;
    return authentication && authentication['threeds2.fingerprintToken'];
  }

  get adyenChallengeToken () {
    const { authentication } = this.actionToken.three_d_secure.params;
    return authentication && authentication['threeds2.challengeToken'];
  }

  get adyenRedirectParams () {
    return this.actionToken.three_d_secure.params.redirect;
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    const { shouldFallback, shouldFingerprint, shouldChallenge } = this;

    if (shouldFingerprint) {
      this.whenReady(() => this.fingerprint());
    } else if (shouldChallenge) {
      this.whenReady(() => this.challenge());
    } else if (shouldFallback) {
      this.fallback();
    } else {
      const cause = 'We could not determine an authentication method';
      this.threeDSecure.error('3ds-auth-determination-error', { cause })
    }
  }

  /**
   * Removes DOM elements
   */
  remove () {
    const { frame } = this;
    if (frame) frame.destroy();
    super.remove();
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
      onError: cause => this.threeDSecure.error('3ds-auth-error', { cause }),
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
      onError: cause => this.threeDSecure.error('3ds-auth-error', { cause }),
      size: '05'
    });

    challengeService.mount(container);
  }

  /**
   * Constructs a 3D Secure 1.0 iframe
   *
   * TODO: Move this into a separate strategy, and have this strategy
   *       instruct ThreeDSecureConcern to employ it instead
   */
  fallback () {
    debug('Initiating 3D Secure 1.0 frame');
    const { adyenRedirectParams, container, threeDSecure } = this;
    const { recurly } = threeDSecure.risk;
    const payload = {
      redirect_url: adyenRedirectParams.url,
      ...adyenRedirectParams.data
    };
    this.frame = recurly.Frame({ type: 'iframe', path: '/three_d_secure/start', payload, container })
      .on('error', cause => this.threeDSecure.error('3ds-auth-error', { cause }))
      .on('done', results => this.emit('done', results));
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
