import ThreeDSecureStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/strategy';

const debug = require('debug')('recurly:risk:three-d-secure:mock-adyen');

/**
 * Mock Adyen Strategy for testing 3DS scenarios without UI interaction
 * This strategy simulates Adyen 3DS flows programmatically for testing purposes
 */
export default class MockAdyenStrategy extends ThreeDSecureStrategy {
  static strategyName = 'mock-adyen';

  constructor (...args) {
    super(...args);
    this.simulateDelay = 100; // Default delay for simulation
    this.markReady();
  }

  get shouldFingerprint () {
    return !!this.adyenFingerprintToken;
  }

  get shouldChallenge () {
    return !!this.adyenChallengeToken;
  }

  get shouldRedirect () {
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
    const threeDSecureParams = this.actionToken.three_d_secure.params;

    if (threeDSecureParams.type === 'redirect') {
      const { data } = threeDSecureParams;
      return {
        redirect_url: threeDSecureParams.url,
        ...(data ? {
          pa_req: data?.PaReq,
          md: data?.MD
        } : {})
      };
    }

    const redirectParams = threeDSecureParams.redirect;
    if (!redirectParams) return undefined;

    return {
      redirect_url: redirectParams.url,
      pa_req: (redirectParams.data.pa_req || redirectParams.data.PaReq),
      md: (redirectParams.data.md || redirectParams.data.MD)
    };
  }

  /**
   * Simulates device fingerprinting without UI interaction
   */
  attach (element) {
    super.attach(element);
    debug('Mock Adyen attach called');

    const { shouldRedirect, shouldFingerprint, shouldChallenge } = this;

    if (shouldFingerprint) {
      this.whenReady(() => this.simulateFingerprint());
    } else if (shouldChallenge) {
      this.whenReady(() => this.simulateChallenge());
    } else if (shouldRedirect) {
      this.whenReady(() => this.simulateRedirect());
    } else {
      const cause = 'We could not determine an authentication method';
      this.threeDSecure.error('3ds-auth-determination-error', { cause });
    }
  }

  /**
   * Simulates device fingerprinting process
   */
  simulateFingerprint () {
    debug('Simulating Adyen fingerprinting');
    
    // Simulate the fingerprinting process with a delay
    setTimeout(() => {
      const mockResults = {
        data: {
          details: {
            'threeds2.fingerprint': 'mock-fingerprint-data',
            'threeds2.challengeResult': 'mock-challenge-result'
          }
        }
      };
      
      this.emit('done', mockResults);
    }, this.simulateDelay);
  }

  /**
   * Simulates 3DS challenge process
   */
  simulateChallenge () {
    debug('Simulating Adyen challenge');
    
    // Simulate the challenge process with a delay
    setTimeout(() => {
      const mockResults = {
        data: {
          details: {
            'threeds2.challengeResult': 'mock-challenge-success',
            'threeds2.fingerprint': 'mock-fingerprint-data'
          }
        }
      };
      
      this.emit('done', mockResults);
    }, this.simulateDelay);
  }

  /**
   * Simulates redirect flow
   */
  simulateRedirect () {
    debug('Simulating Adyen redirect');
    
    // Simulate the redirect process with a delay
    setTimeout(() => {
      const mockResults = {
        redirect_url: this.adyenRedirectParams.redirect_url,
        pa_req: this.adyenRedirectParams.pa_req,
        md: this.adyenRedirectParams.md,
        status: 'success'
      };
      
      this.emit('done', mockResults);
    }, this.simulateDelay);
  }

  /**
   * Sets the simulation delay for testing different timing scenarios
   * @param {number} delay - Delay in milliseconds
   */
  setSimulationDelay (delay) {
    this.simulateDelay = delay;
  }

  /**
   * Simulates an error scenario
   * @param {string} errorType - Type of error to simulate
   */
  simulateError (errorType = 'auth-error') {
    debug(`Simulating Adyen error: ${errorType}`);
    
    setTimeout(() => {
      const error = new Error(`Mock Adyen ${errorType}`);
      error.code = errorType;
      this.threeDSecure.error('3ds-auth-error', { cause: error });
    }, this.simulateDelay);
  }

  /**
   * Simulates a timeout scenario
   */
  simulateTimeout () {
    debug('Simulating Adyen timeout');
    
    // Don't emit anything, just let it timeout
    // This can be used to test timeout handling
  }
}