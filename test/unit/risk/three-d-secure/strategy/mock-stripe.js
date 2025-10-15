import ThreeDSecureStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/strategy';

const debug = require('debug')('recurly:risk:three-d-secure:mock-stripe');

/**
 * Mock Stripe Strategy for testing 3DS scenarios without UI interaction
 * This strategy simulates Stripe 3DS flows programmatically for testing purposes
 */
export default class MockStripeStrategy extends ThreeDSecureStrategy {
  static strategyName = 'mock-stripe';
  static PAYMENT_INTENT_STATUS_SUCCEEDED = 'succeeded';

  constructor (...args) {
    super(...args);
    this.simulateDelay = 100; // Default delay for simulation
    this.markReady();
  }

  get stripePublishableKey () {
    return this.actionToken.gateway.credentials.publishable_key;
  }

  get stripeClientSecret () {
    return this.actionToken.three_d_secure.params.client_secret;
  }

  /**
   * Simulates Stripe 3DS authentication without UI interaction
   */
  attach (element) {
    super.attach(element);
    debug('Mock Stripe attach called');

    this.whenReady(() => {
      this.simulateStripeAuthentication();
    });
  }

  /**
   * Simulates Stripe handleNextAction process
   */
  simulateStripeAuthentication () {
    debug('Simulating Stripe authentication');
    
    const isPaymentIntent = this.stripeClientSecret.indexOf('pi') === 0;
    
    // Simulate the authentication process with a delay
    setTimeout(() => {
      const mockResult = {
        paymentIntent: isPaymentIntent ? {
          id: 'pi_mock_test_id',
          status: MockStripeStrategy.PAYMENT_INTENT_STATUS_SUCCEEDED,
          client_secret: this.stripeClientSecret
        } : undefined,
        setupIntent: !isPaymentIntent ? {
          id: 'seti_mock_test_id',
          status: MockStripeStrategy.PAYMENT_INTENT_STATUS_SUCCEEDED,
          client_secret: this.stripeClientSecret
        } : undefined
      };
      
      const { id } = mockResult.paymentIntent || mockResult.setupIntent;
      this.emit('done', { id });
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
   * Simulates a Stripe authentication error
   * @param {string} errorType - Type of error to simulate
   */
  simulateError (errorType = 'card_error') {
    debug(`Simulating Stripe error: ${errorType}`);
    
    setTimeout(() => {
      const error = new Error(`Mock Stripe ${errorType}`);
      error.type = errorType;
      error.code = errorType;
      this.threeDSecure.error('3ds-auth-error', { cause: error });
    }, this.simulateDelay);
  }

  /**
   * Simulates a Payment Intent that requires additional authentication
   */
  simulateRequiresAction () {
    debug('Simulating Stripe requires action');
    
    setTimeout(() => {
      const error = new Error('Mock Stripe requires action');
      error.type = 'card_error';
      error.code = 'authentication_required';
      this.threeDSecure.error('3ds-auth-error', { cause: error });
    }, this.simulateDelay);
  }

  /**
   * Simulates a timeout scenario
   */
  simulateTimeout () {
    debug('Simulating Stripe timeout');
    
    // Don't emit anything, just let it timeout
    // This can be used to test timeout handling
  }

  /**
   * Simulates a successful authentication with custom result
   * @param {Object} customResult - Custom result to return
   */
  simulateCustomResult (customResult) {
    debug('Simulating Stripe custom result');
    
    setTimeout(() => {
      this.emit('done', customResult);
    }, this.simulateDelay);
  }
}