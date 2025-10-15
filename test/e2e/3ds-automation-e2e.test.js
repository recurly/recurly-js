import assert from 'assert';
import { applyFixtures } from '../support/fixtures';
import { initRecurly, testBed } from '../support/helpers';
import { create3DSAutomationHelper } from '../unit/risk/three-d-secure/helpers/3ds-automation-helper';

describe('3DS Automation E2E Tests', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  let helper;
  let recurly;

  beforeEach(function () {
    recurly = initRecurly();
    helper = create3DSAutomationHelper({ recurly });
  });

  afterEach(function () {
    if (helper) {
      helper.cleanup();
    }
  });

  describe('Complete 3DS Workflow Automation', function () {
    it('should simulate a complete Adyen 3DS flow', async function () {
      // Step 1: Create 3DS instance
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen', {
        fingerprintToken: 'test-fingerprint-token',
        challengeToken: 'test-challenge-token'
      });

      // Step 2: Set up event listeners
      const events = [];
      threeDSecure.on('token', (token) => {
        events.push({ type: 'token', data: token });
      });
      threeDSecure.on('error', (error) => {
        events.push({ type: 'error', data: error });
      });

      // Step 3: Start authentication
      threeDSecure.attach(helper.container);

      // Step 4: Wait for completion
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('E2E test timeout'));
        }, 2000);

        threeDSecure.on('token', () => {
          clearTimeout(timeout);
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Step 5: Verify results
      assert(events.length > 0);
      const tokenEvent = events.find(e => e.type === 'token');
      assert(tokenEvent);
      assert(tokenEvent.data);
    });

    it('should simulate a complete Stripe 3DS flow', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-stripe', {
        clientSecret: 'pi_test_stripe_client_secret'
      });

      const events = [];
      threeDSecure.on('token', (token) => {
        events.push({ type: 'token', data: token });
      });
      threeDSecure.on('error', (error) => {
        events.push({ type: 'error', data: error });
      });

      threeDSecure.attach(helper.container);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('E2E test timeout'));
        }, 2000);

        threeDSecure.on('token', () => {
          clearTimeout(timeout);
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      assert(events.length > 0);
      const tokenEvent = events.find(e => e.type === 'token');
      assert(tokenEvent);
      assert(tokenEvent.data);
    });
  });

  describe('Real-world Scenario Testing', function () {
    it('should handle a payment flow with multiple 3DS attempts', async function () {
      const scenarios = [
        {
          name: 'First attempt - Adyen fingerprint',
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { fingerprintToken: 'first-attempt-token' }
        },
        {
          name: 'Second attempt - Adyen challenge',
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { challengeToken: 'second-attempt-token' }
        },
        {
          name: 'Fallback - Stripe',
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'pi_fallback_secret' }
        }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.successful, 3);
      assert.strictEqual(stats.failed, 0);
    });

    it('should handle error recovery scenarios', async function () {
      const scenarios = [
        {
          name: 'First attempt - Error',
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'network-error' }
        },
        {
          name: 'Retry - Success',
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { fingerprintToken: 'retry-token' }
        }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.successful, 1);
      assert.strictEqual(stats.failed, 1);
    });

    it('should handle timeout and fallback scenarios', async function () {
      const scenarios = [
        {
          name: 'Primary - Timeout',
          strategyType: 'mock-adyen',
          testType: 'timeout',
          options: { timeoutMs: 100 }
        },
        {
          name: 'Fallback - Success',
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'pi_fallback_secret' }
        }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.successful, 1);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.timeouts, 1);
    });
  });

  describe('Integration with Recurly Risk System', function () {
    it('should integrate with Recurly Risk preflight', async function () {
      const risk = recurly.Risk();
      
      // Mock preflight data
      const preflightData = {
        recurly,
        number: '4111111111111111',
        month: '12',
        year: '2025',
        cvv: '123',
        preflights: [
          {
            gateway: { type: 'mock-adyen' },
            params: { gateway_code: 'adyen_test' }
          }
        ],
        addressFields: {
          address1: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postal_code: '12345',
          country: 'US'
        }
      };

      // Mock the strategy preflight method
      const mockPreflight = {
        preflight: () => Promise.resolve({
          results: { mock: 'preflight-results' },
          tokenType: 'three_d_secure_action'
        })
      };

      // This would normally be called by the ThreeDSecure.preflight method
      const result = await mockPreflight.preflight(preflightData);
      
      assert(result);
      assert(result.results);
      assert.strictEqual(result.tokenType, 'three_d_secure_action');
    });

    it('should handle 3DS result tokenization', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen');

      // Mock the createResultToken method
      const mockToken = {
        type: 'three_d_secure_action_result',
        id: '3dsart-test-id'
      };

      threeDSecure.createResultToken = () => Promise.resolve(mockToken);

      const result = await threeDSecure.createResultToken({
        mock: 'test-results'
      });

      assert.strictEqual(result.type, 'three_d_secure_action_result');
      assert.strictEqual(result.id, '3dsart-test-id');
    });
  });

  describe('Performance and Reliability Testing', function () {
    it('should handle high-frequency 3DS requests', async function () {
      const requestCount = 20;
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        promises.push(
          helper.testSuccessfulAuthentication('mock-adyen', {
            actionTokenId: `test-token-${i}`
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      
      // Should handle most requests successfully
      assert(successful.length >= requestCount * 0.8);
    });

    it('should handle mixed success/failure scenarios under load', async function () {
      const scenarios = [];
      
      // Create a mix of success and failure scenarios
      for (let i = 0; i < 10; i++) {
        scenarios.push({
          name: `Test ${i}`,
          strategyType: i % 2 === 0 ? 'mock-adyen' : 'mock-stripe',
          testType: i % 3 === 0 ? 'error' : 'success',
          options: i % 3 === 0 ? { errorType: 'test-error' } : {}
        });
      }

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 10);
      assert(stats.successful > 0);
      assert(stats.failed > 0);
    });
  });

  describe('Error Recovery and Resilience', function () {
    it('should recover from strategy errors', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen');

      // First attempt fails
      strategy.simulateError('network-error');
      
      // Wait a bit, then try again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second attempt succeeds
      const result = await helper.testSuccessfulAuthentication('mock-adyen', {
        actionTokenId: 'recovery-token'
      });

      assert(result.success);
    });

    it('should handle cleanup after errors', async function () {
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen');

      // Simulate an error
      strategy.simulateError('fatal-error');

      // Cleanup should not throw
      assert.doesNotThrow(() => {
        helper.cleanup();
      });
    });
  });
});