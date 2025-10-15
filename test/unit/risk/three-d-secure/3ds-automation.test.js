import assert from 'assert';
import { applyFixtures } from '../support/fixtures';
import { create3DSAutomationHelper } from './helpers/3ds-automation-helper';

describe('3DS Automation Tests', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  let helper;

  beforeEach(function () {
    helper = create3DSAutomationHelper();
  });

  afterEach(function () {
    if (helper) {
      helper.cleanup();
    }
  });

  describe('Adyen 3DS Automation', function () {
    it('should successfully complete fingerprint authentication', async function () {
      const result = await helper.testSuccessfulAuthentication('mock-adyen', {
        fingerprintToken: 'test-fingerprint-token'
      });

      assert(result.success);
      assert(result.token);
      assert(result.strategy);
    });

    it('should successfully complete challenge authentication', async function () {
      const result = await helper.testSuccessfulAuthentication('mock-adyen', {
        challengeToken: 'test-challenge-token'
      });

      assert(result.success);
      assert(result.token);
    });

    it('should handle authentication errors', async function () {
      const result = await helper.testFailedAuthentication('mock-adyen', 'auth-error');

      assert(!result.success);
      assert(result.error);
      assert.strictEqual(result.error.code, '3ds-auth-error');
    });

    it('should handle timeout scenarios', async function () {
      const result = await helper.testTimeout('mock-adyen', 500);

      assert(!result.success);
      assert.strictEqual(result.error, 'timeout');
    });

    it('should handle different error types', async function () {
      const errorTypes = ['auth-error', 'network-error', 'validation-error'];
      
      for (const errorType of errorTypes) {
        const result = await helper.testFailedAuthentication('mock-adyen', errorType);
        assert(!result.success);
        assert(result.error);
      }
    });
  });

  describe('Stripe 3DS Automation', function () {
    it('should successfully complete payment intent authentication', async function () {
      const result = await helper.testSuccessfulAuthentication('mock-stripe', {
        clientSecret: 'pi_test_stripe_client_secret'
      });

      assert(result.success);
      assert(result.token);
      assert(result.strategy);
    });

    it('should successfully complete setup intent authentication', async function () {
      const result = await helper.testSuccessfulAuthentication('mock-stripe', {
        clientSecret: 'seti_test_stripe_client_secret'
      });

      assert(result.success);
      assert(result.token);
    });

    it('should handle card errors', async function () {
      const result = await helper.testFailedAuthentication('mock-stripe', 'card_error');

      assert(!result.success);
      assert(result.error);
      assert.strictEqual(result.error.code, '3ds-auth-error');
    });

    it('should handle authentication required errors', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-stripe');
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 1000);

        threeDSecure.on('token', (token) => {
          clearTimeout(timeout);
          reject(new Error('Expected error but got success'));
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          assert.strictEqual(error.code, '3ds-auth-error');
          assert.strictEqual(error.cause.type, 'card_error');
          assert.strictEqual(error.cause.code, 'authentication_required');
          resolve();
        });

        threeDSecure.attach(helper.container);
        
        setTimeout(() => {
          strategy.simulateRequiresAction();
        }, 50);
      });
    });
  });

  describe('Multiple Scenario Testing', function () {
    it('should test multiple scenarios in sequence', async function () {
      const scenarios = [
        {
          name: 'Adyen Success',
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { fingerprintToken: 'test-token' }
        },
        {
          name: 'Stripe Success',
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'pi_test_secret' }
        },
        {
          name: 'Adyen Error',
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'auth-error' }
        },
        {
          name: 'Stripe Timeout',
          strategyType: 'mock-stripe',
          testType: 'timeout',
          options: { timeoutMs: 200 }
        }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      
      assert.strictEqual(results.length, 4);
      
      const stats = helper.getTestStatistics(results);
      assert.strictEqual(stats.total, 4);
      assert.strictEqual(stats.successful, 2);
      assert.strictEqual(stats.failed, 2);
      assert.strictEqual(stats.timeouts, 1);
      assert.strictEqual(stats.errors, 1);
    });

    it('should handle mixed success and failure scenarios', async function () {
      const scenarios = [
        { name: 'Success 1', strategyType: 'mock-adyen', testType: 'success' },
        { name: 'Error 1', strategyType: 'mock-adyen', testType: 'error' },
        { name: 'Success 2', strategyType: 'mock-stripe', testType: 'success' },
        { name: 'Timeout 1', strategyType: 'mock-stripe', testType: 'timeout', options: { timeoutMs: 100 } }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);
      
      assert.strictEqual(stats.total, 4);
      assert.strictEqual(stats.successful, 2);
      assert.strictEqual(stats.failed, 2);
    });
  });

  describe('Custom Strategy Configuration', function () {
    it('should allow custom simulation delays', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen');
      
      // Set a custom delay
      strategy.setSimulationDelay(200);
      
      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 1000);

        threeDSecure.on('token', (token) => {
          const elapsed = Date.now() - startTime;
          clearTimeout(timeout);
          
          // Should take at least 200ms due to our custom delay
          assert(elapsed >= 200);
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        threeDSecure.attach(helper.container);
      });
    });

    it('should allow custom result simulation', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-stripe');
      
      const customResult = { id: 'custom_test_id', customField: 'custom_value' };
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 1000);

        threeDSecure.on('token', (token) => {
          clearTimeout(timeout);
          assert.deepStrictEqual(token, customResult);
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        threeDSecure.attach(helper.container);
        
        // Simulate custom result
        setTimeout(() => {
          strategy.simulateCustomResult(customResult);
        }, 50);
      });
    });
  });

  describe('Error Handling and Edge Cases', function () {
    it('should handle strategy creation errors', async function () {
      try {
        await helper.createMock3DS('unknown-strategy');
        assert.fail('Expected error for unknown strategy');
      } catch (error) {
        assert.strictEqual(error.message, 'Unknown strategy type: unknown-strategy');
      }
    });

    it('should handle cleanup properly', function () {
      // Create multiple instances
      const promises = [
        helper.createMock3DS('mock-adyen'),
        helper.createMock3DS('mock-stripe'),
        helper.createMock3DS('mock-adyen', { actionTokenId: 'test-2' })
      ];

      return Promise.all(promises).then(() => {
        // Cleanup should not throw errors
        assert.doesNotThrow(() => {
          helper.cleanup();
        });
        
        // Strategies should be cleared
        assert.strictEqual(helper.strategies.size, 0);
      });
    });

    it('should handle concurrent test execution', async function () {
      const promises = [
        helper.testSuccessfulAuthentication('mock-adyen'),
        helper.testSuccessfulAuthentication('mock-stripe'),
        helper.testFailedAuthentication('mock-adyen', 'auth-error')
      ];

      const results = await Promise.allSettled(promises);
      
      // All tests should complete (some may succeed, some may fail)
      assert.strictEqual(results.length, 3);
      
      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      assert(successful.length > 0);
    });
  });

  describe('Performance and Load Testing', function () {
    it('should handle rapid sequential tests', async function () {
      const testCount = 10;
      const results = [];
      
      for (let i = 0; i < testCount; i++) {
        const result = await helper.testSuccessfulAuthentication('mock-adyen');
        results.push(result);
      }
      
      assert.strictEqual(results.length, testCount);
      results.forEach(result => {
        assert(result.success);
      });
    });

    it('should handle concurrent load testing', async function () {
      const testCount = 5;
      const promises = [];
      
      for (let i = 0; i < testCount; i++) {
        promises.push(helper.testSuccessfulAuthentication('mock-adyen'));
      }
      
      const results = await Promise.all(promises);
      
      assert.strictEqual(results.length, testCount);
      results.forEach(result => {
        assert(result.success);
      });
    });
  });
});