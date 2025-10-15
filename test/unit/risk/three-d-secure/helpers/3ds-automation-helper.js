import assert from 'assert';
import Promise from 'promise';
import { initRecurly, testBed } from '../../../support/helpers';
import MockAdyenStrategy from '../strategy/mock-adyen';
import MockStripeStrategy from '../strategy/mock-stripe';

/**
 * Helper class for automating 3DS scenarios without UI interaction
 * This class provides utilities to test 3DS flows programmatically
 */
export class ThreeDSAutomationHelper {
  constructor (options = {}) {
    this.recurly = options.recurly || initRecurly();
    this.defaultTimeout = options.defaultTimeout || 5000;
    this.container = options.container || testBed().querySelector('#three-d-secure-container');
    this.strategies = new Map();
  }

  /**
   * Creates a mock 3DS instance with a specific strategy
   * @param {string} strategyType - Type of strategy ('mock-adyen', 'mock-stripe', etc.)
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Promise resolving to 3DS instance and strategy
   */
  async createMock3DS (strategyType, options = {}) {
    const actionTokenId = options.actionTokenId || `action-token-${strategyType}`;
    const risk = this.recurly.Risk();
    
    // Create a mock action token
    const mockActionToken = this.createMockActionToken(strategyType, options);
    
    // Mock the token request
    this.recurly.request.get = () => Promise.resolve(mockActionToken);
    
    const threeDSecure = risk.ThreeDSecure({ actionTokenId });
    
    // Wait for the 3DS instance to be ready
    await new Promise((resolve) => {
      threeDSecure.whenReady(() => resolve());
    });
    
    // Replace the strategy with our mock
    const mockStrategy = this.createMockStrategy(strategyType, threeDSecure, mockActionToken);
    threeDSecure.strategy = mockStrategy;
    
    this.strategies.set(actionTokenId, { threeDSecure, strategy: mockStrategy });
    
    return { threeDSecure, strategy: mockStrategy };
  }

  /**
   * Creates a mock action token for testing
   * @param {string} strategyType - Type of strategy
   * @param {Object} options - Configuration options
   * @returns {Object} - Mock action token
   */
  createMockActionToken (strategyType, options = {}) {
    const baseToken = {
      id: options.actionTokenId || `action-token-${strategyType}`,
      type: 'three_d_secure_action',
      gateway: {
        type: strategyType,
        credentials: {
          publishable_key: options.publishableKey || 'test-publishable-key'
        }
      },
      three_d_secure: {
        params: {}
      }
    };

    switch (strategyType) {
      case 'mock-adyen':
        return {
          ...baseToken,
          three_d_secure: {
            params: {
              authentication: {
                'threeds2.fingerprintToken': options.fingerprintToken || 'test-fingerprint-token',
                'threeds2.challengeToken': options.challengeToken || 'test-challenge-token'
              }
            }
          }
        };

      case 'mock-stripe':
        return {
          ...baseToken,
          three_d_secure: {
            params: {
              client_secret: options.clientSecret || 'pi_test_stripe_client_secret'
            }
          }
        };

      default:
        return baseToken;
    }
  }

  /**
   * Creates a mock strategy instance
   * @param {string} strategyType - Type of strategy
   * @param {Object} threeDSecure - 3DS instance
   * @param {Object} actionToken - Action token
   * @returns {Object} - Mock strategy instance
   */
  createMockStrategy (strategyType, threeDSecure, actionToken) {
    switch (strategyType) {
      case 'mock-adyen':
        return new MockAdyenStrategy({ threeDSecure, actionToken });
      case 'mock-stripe':
        return new MockStripeStrategy({ threeDSecure, actionToken });
      default:
        throw new Error(`Unknown strategy type: ${strategyType}`);
    }
  }

  /**
   * Tests a successful 3DS authentication flow
   * @param {string} strategyType - Type of strategy to test
   * @param {Object} options - Test options
   * @returns {Promise<Object>} - Promise resolving to test results
   */
  async testSuccessfulAuthentication (strategyType, options = {}) {
    const { threeDSecure, strategy } = await this.createMock3DS(strategyType, options);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, this.defaultTimeout);

      threeDSecure.on('token', (token) => {
        clearTimeout(timeout);
        resolve({ success: true, token, strategy });
      });

      threeDSecure.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Start the authentication process
      threeDSecure.attach(this.container);
    });
  }

  /**
   * Tests a failed 3DS authentication flow
   * @param {string} strategyType - Type of strategy to test
   * @param {string} errorType - Type of error to simulate
   * @param {Object} options - Test options
   * @returns {Promise<Object>} - Promise resolving to error details
   */
  async testFailedAuthentication (strategyType, errorType = 'auth-error', options = {}) {
    const { threeDSecure, strategy } = await this.createMock3DS(strategyType, options);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test timeout'));
      }, this.defaultTimeout);

      threeDSecure.on('token', (token) => {
        clearTimeout(timeout);
        reject(new Error('Expected error but got success'));
      });

      threeDSecure.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error, strategy });
      });

      // Start the authentication process
      threeDSecure.attach(this.container);
      
      // Simulate the error after a short delay
      setTimeout(() => {
        strategy.simulateError(errorType);
      }, 50);
    });
  }

  /**
   * Tests a timeout scenario
   * @param {string} strategyType - Type of strategy to test
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {Object} options - Test options
   * @returns {Promise<Object>} - Promise resolving to timeout result
   */
  async testTimeout (strategyType, timeoutMs = 1000, options = {}) {
    const { threeDSecure, strategy } = await this.createMock3DS(strategyType, options);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'timeout', strategy });
      }, timeoutMs);

      threeDSecure.on('token', (token) => {
        clearTimeout(timeout);
        reject(new Error('Expected timeout but got success'));
      });

      threeDSecure.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error('Expected timeout but got error'));
      });

      // Start the authentication process
      threeDSecure.attach(this.container);
      
      // Simulate timeout by not calling any completion methods
      strategy.simulateTimeout();
    });
  }

  /**
   * Tests multiple 3DS scenarios in sequence
   * @param {Array} scenarios - Array of scenario configurations
   * @returns {Promise<Array>} - Promise resolving to array of results
   */
  async testMultipleScenarios (scenarios) {
    const results = [];
    
    for (const scenario of scenarios) {
      try {
        const result = await this.testScenario(scenario);
        results.push({ ...result, scenario: scenario.name || 'unnamed' });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          scenario: scenario.name || 'unnamed' 
        });
      }
    }
    
    return results;
  }

  /**
   * Tests a single scenario based on configuration
   * @param {Object} scenario - Scenario configuration
   * @returns {Promise<Object>} - Promise resolving to scenario result
   */
  async testScenario (scenario) {
    const { strategyType, testType, options = {} } = scenario;
    
    switch (testType) {
      case 'success':
        return await this.testSuccessfulAuthentication(strategyType, options);
      case 'error':
        return await this.testFailedAuthentication(strategyType, options.errorType, options);
      case 'timeout':
        return await this.testTimeout(strategyType, options.timeoutMs, options);
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }
  }

  /**
   * Cleans up all created 3DS instances
   */
  cleanup () {
    for (const [actionTokenId, { threeDSecure }] of this.strategies) {
      try {
        threeDSecure.remove();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.strategies.clear();
  }

  /**
   * Gets statistics about completed tests
   * @param {Array} results - Array of test results
   * @returns {Object} - Statistics object
   */
  getTestStatistics (results) {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      timeouts: 0,
      errors: 0
    };

    results.forEach(result => {
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
        if (result.error === 'timeout') {
          stats.timeouts++;
        } else {
          stats.errors++;
        }
      }
    });

    return stats;
  }
}

/**
 * Factory function to create a 3DS automation helper
 * @param {Object} options - Configuration options
 * @returns {ThreeDSAutomationHelper} - Helper instance
 */
export function create3DSAutomationHelper (options = {}) {
  return new ThreeDSAutomationHelper(options);
}

export default ThreeDSAutomationHelper;