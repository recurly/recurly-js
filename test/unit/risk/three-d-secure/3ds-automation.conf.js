/**
 * Configuration file for 3DS automation tests
 * This file contains test configurations and utilities for running 3DS tests without UI interaction
 */

export const testConfig = {
  // Default test timeouts
  timeouts: {
    default: 5000,
    short: 1000,
    long: 10000
  },

  // Mock strategy configurations
  strategies: {
    'mock-adyen': {
      defaultDelay: 100,
      errorTypes: ['auth-error', 'network-error', 'validation-error'],
      supportedFlows: ['fingerprint', 'challenge', 'redirect']
    },
    'mock-stripe': {
      defaultDelay: 100,
      errorTypes: ['card_error', 'api_error', 'authentication_required'],
      supportedFlows: ['payment_intent', 'setup_intent']
    }
  },

  // Test scenario templates
  scenarios: {
    success: {
      adyen: {
        fingerprint: {
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { fingerprintToken: 'test-fingerprint-token' }
        },
        challenge: {
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { challengeToken: 'test-challenge-token' }
        }
      },
      stripe: {
        paymentIntent: {
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'pi_test_stripe_client_secret' }
        },
        setupIntent: {
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'seti_test_stripe_client_secret' }
        }
      }
    },
    error: {
      adyen: {
        authError: {
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'auth-error' }
        },
        networkError: {
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'network-error' }
        }
      },
      stripe: {
        cardError: {
          strategyType: 'mock-stripe',
          testType: 'error',
          options: { errorType: 'card_error' }
        },
        authRequired: {
          strategyType: 'mock-stripe',
          testType: 'error',
          options: { errorType: 'authentication_required' }
        }
      }
    },
    timeout: {
      short: {
        strategyType: 'mock-adyen',
        testType: 'timeout',
        options: { timeoutMs: 100 }
      },
      medium: {
        strategyType: 'mock-stripe',
        testType: 'timeout',
        options: { timeoutMs: 500 }
      }
    }
  },

  // Performance test configurations
  performance: {
    loadTest: {
      requestCount: 20,
      concurrency: 5
    },
    stressTest: {
      requestCount: 100,
      concurrency: 10
    }
  }
};

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generates mock action tokens for different scenarios
   */
  generateActionToken: (strategyType, options = {}) => {
    const baseToken = {
      id: options.id || `action-token-${strategyType}-${Date.now()}`,
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
  },

  /**
   * Generates test scenarios for batch testing
   */
  generateTestScenarios: (count = 10, options = {}) => {
    const scenarios = [];
    const strategyTypes = ['mock-adyen', 'mock-stripe'];
    const testTypes = ['success', 'error', 'timeout'];

    for (let i = 0; i < count; i++) {
      const strategyType = strategyTypes[i % strategyTypes.length];
      const testType = testTypes[i % testTypes.length];
      
      scenarios.push({
        name: `Test ${i + 1}`,
        strategyType,
        testType,
        options: {
          actionTokenId: `test-token-${i}`,
          ...options
        }
      });
    }

    return scenarios;
  }
};

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Creates a test suite for a specific strategy
   */
  createStrategyTestSuite: (strategyType) => {
    return {
      success: () => testConfig.scenarios.success[strategyType] || {},
      error: () => testConfig.scenarios.error[strategyType] || {},
      timeout: () => testConfig.scenarios.timeout
    };
  },

  /**
   * Validates test results
   */
  validateResults: (results, expectedCount) => {
    const stats = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    if (expectedCount && stats.total !== expectedCount) {
      throw new Error(`Expected ${expectedCount} results, got ${stats.total}`);
    }

    return stats;
  },

  /**
   * Creates performance test configuration
   */
  createPerformanceTest: (type = 'loadTest') => {
    const config = testConfig.performance[type];
    if (!config) {
      throw new Error(`Unknown performance test type: ${type}`);
    }

    return {
      ...config,
      scenarios: testData.generateTestScenarios(config.requestCount)
    };
  }
};

export default {
  testConfig,
  testData,
  testUtils
};