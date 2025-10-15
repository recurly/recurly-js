import assert from 'assert';
import { applyFixtures } from '../../support/fixtures';
import { create3DSAutomationHelper } from '../helpers/3ds-automation-helper';
import { testConfig, testData, testUtils } from '../3ds-automation.conf';

describe('3DS Automation Examples', function () {
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

  describe('Basic Usage Examples', function () {
    it('should demonstrate basic successful authentication', async function () {
      // Example 1: Simple success test
      const result = await helper.testSuccessfulAuthentication('mock-adyen');
      
      assert(result.success);
      assert(result.token);
      assert(result.strategy);
      console.log('✅ Basic success test passed');
    });

    it('should demonstrate error handling', async function () {
      // Example 2: Error scenario testing
      const result = await helper.testFailedAuthentication('mock-stripe', 'card_error');
      
      assert(!result.success);
      assert(result.error);
      assert.strictEqual(result.error.code, '3ds-auth-error');
      console.log('✅ Error handling test passed');
    });

    it('should demonstrate timeout handling', async function () {
      // Example 3: Timeout scenario testing
      const result = await helper.testTimeout('mock-adyen', 200);
      
      assert(!result.success);
      assert.strictEqual(result.error, 'timeout');
      console.log('✅ Timeout handling test passed');
    });
  });

  describe('Advanced Usage Examples', function () {
    it('should demonstrate custom configuration', async function () {
      // Example 4: Custom 3DS instance with specific options
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen', {
        fingerprintToken: 'custom-fingerprint-token',
        challengeToken: 'custom-challenge-token',
        actionTokenId: 'custom-action-token'
      });

      // Set custom simulation delay
      strategy.setSimulationDelay(300);

      const startTime = Date.now();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timeout'));
        }, 1000);

        threeDSecure.on('token', (token) => {
          const elapsed = Date.now() - startTime;
          clearTimeout(timeout);
          
          // Should take at least 300ms due to custom delay
          assert(elapsed >= 300);
          assert(token);
          console.log('✅ Custom configuration test passed');
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        threeDSecure.attach(helper.container);
      });
    });

    it('should demonstrate batch testing', async function () {
      // Example 5: Testing multiple scenarios in batch
      const scenarios = [
        {
          name: 'Adyen Success',
          strategyType: 'mock-adyen',
          testType: 'success'
        },
        {
          name: 'Stripe Success',
          strategyType: 'mock-stripe',
          testType: 'success'
        },
        {
          name: 'Adyen Error',
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'auth-error' }
        }
      ];

      const results = await helper.testMultipleScenarios(scenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.successful, 2);
      assert.strictEqual(stats.failed, 1);
      console.log('✅ Batch testing passed:', stats);
    });

    it('should demonstrate performance testing', async function () {
      // Example 6: Performance testing with multiple concurrent requests
      const requestCount = 5;
      const promises = [];

      for (let i = 0; i < requestCount; i++) {
        promises.push(
          helper.testSuccessfulAuthentication('mock-adyen', {
            actionTokenId: `perf-test-${i}`
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      
      assert(successful.length >= requestCount * 0.8); // At least 80% success rate
      console.log(`✅ Performance test passed: ${successful.length}/${requestCount} successful`);
    });
  });

  describe('Real-world Scenario Examples', function () {
    it('should demonstrate payment flow with fallback', async function () {
      // Example 7: Payment flow with primary and fallback methods
      const paymentFlow = [
        {
          name: 'Primary - Adyen',
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'network-error' }
        },
        {
          name: 'Fallback - Stripe',
          strategyType: 'mock-stripe',
          testType: 'success',
          options: { clientSecret: 'pi_fallback_secret' }
        }
      ];

      const results = await helper.testMultipleScenarios(paymentFlow);
      const stats = helper.getTestStatistics(results);

      // First attempt should fail, second should succeed
      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.successful, 1);
      console.log('✅ Payment flow with fallback test passed');
    });

    it('should demonstrate retry logic', async function () {
      // Example 8: Retry logic after initial failure
      const retryScenarios = [
        {
          name: 'First attempt - Error',
          strategyType: 'mock-adyen',
          testType: 'error',
          options: { errorType: 'auth-error' }
        },
        {
          name: 'Retry attempt - Success',
          strategyType: 'mock-adyen',
          testType: 'success',
          options: { fingerprintToken: 'retry-token' }
        }
      ];

      const results = await helper.testMultipleScenarios(retryScenarios);
      const stats = helper.getTestStatistics(results);

      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.successful, 1);
      console.log('✅ Retry logic test passed');
    });

    it('should demonstrate error recovery', async function () {
      // Example 9: Error recovery and cleanup
      const { threeDSecure, strategy } = await helper.createMock3DS('mock-stripe');

      // Simulate an error
      strategy.simulateError('fatal-error');

      // Wait for error to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup should not throw
      assert.doesNotThrow(() => {
        helper.cleanup();
      });

      console.log('✅ Error recovery test passed');
    });
  });

  describe('Configuration Examples', function () {
    it('should demonstrate using test configuration', function () {
      // Example 10: Using predefined test configurations
      const adyenConfig = testConfig.strategies['mock-adyen'];
      const stripeConfig = testConfig.strategies['mock-stripe'];

      assert(adyenConfig.errorTypes.includes('auth-error'));
      assert(stripeConfig.errorTypes.includes('card_error'));
      assert(adyenConfig.supportedFlows.includes('fingerprint'));
      assert(stripeConfig.supportedFlows.includes('payment_intent'));

      console.log('✅ Configuration usage test passed');
    });

    it('should demonstrate test data generation', function () {
      // Example 11: Generating test data
      const adyenToken = testData.generateActionToken('mock-adyen', {
        fingerprintToken: 'custom-token'
      });

      const stripeToken = testData.generateActionToken('mock-stripe', {
        clientSecret: 'pi_custom_secret'
      });

      assert.strictEqual(adyenToken.gateway.type, 'mock-adyen');
      assert.strictEqual(stripeToken.gateway.type, 'mock-stripe');
      assert(adyenToken.three_d_secure.params.authentication['threeds2.fingerprintToken']);
      assert(stripeToken.three_d_secure.params.client_secret);

      console.log('✅ Test data generation test passed');
    });

    it('should demonstrate scenario generation', function () {
      // Example 12: Generating test scenarios
      const scenarios = testData.generateTestScenarios(5);
      
      assert.strictEqual(scenarios.length, 5);
      scenarios.forEach((scenario, index) => {
        assert(scenario.name);
        assert(scenario.strategyType);
        assert(scenario.testType);
        assert(scenario.options.actionTokenId);
      });

      console.log('✅ Scenario generation test passed');
    });
  });

  describe('Integration Examples', function () {
    it('should demonstrate integration with existing Recurly tests', async function () {
      // Example 13: Integration with existing test patterns
      const recurly = helper.recurly;
      const risk = recurly.Risk();
      
      // Create 3DS instance using Recurly's normal API
      const threeDSecure = risk.ThreeDSecure({ actionTokenId: 'integration-test' });
      
      // Mock the token response
      const mockToken = testData.generateActionToken('mock-adyen');
      threeDSecure.recurly.request.get = () => Promise.resolve(mockToken);
      
      // Wait for ready state
      await new Promise(resolve => {
        threeDSecure.whenReady(() => resolve());
      });

      // Replace with mock strategy
      const { strategy } = await helper.createMock3DS('mock-adyen', {
        actionTokenId: 'integration-test'
      });
      threeDSecure.strategy = strategy;

      // Test the integration
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Integration test timeout'));
        }, 1000);

        threeDSecure.on('token', (token) => {
          clearTimeout(timeout);
          assert(token);
          console.log('✅ Integration test passed');
          resolve();
        });

        threeDSecure.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        threeDSecure.attach(helper.container);
      });
    });

    it('should demonstrate performance testing utilities', function () {
      // Example 14: Using performance testing utilities
      const loadTest = testUtils.createPerformanceTest('loadTest');
      const stressTest = testUtils.createPerformanceTest('stressTest');

      assert(loadTest.requestCount > 0);
      assert(stressTest.requestCount > loadTest.requestCount);
      assert(loadTest.scenarios.length === loadTest.requestCount);

      console.log('✅ Performance testing utilities test passed');
    });
  });

  describe('Best Practices Examples', function () {
    it('should demonstrate proper cleanup', async function () {
      // Example 15: Proper cleanup practices
      const instances = [];
      
      // Create multiple instances
      for (let i = 0; i < 3; i++) {
        const instance = await helper.createMock3DS('mock-adyen', {
          actionTokenId: `cleanup-test-${i}`
        });
        instances.push(instance);
      }

      // Verify instances were created
      assert.strictEqual(instances.length, 3);
      assert(helper.strategies.size > 0);

      // Cleanup
      helper.cleanup();

      // Verify cleanup
      assert.strictEqual(helper.strategies.size, 0);
      console.log('✅ Proper cleanup test passed');
    });

    it('should demonstrate error handling best practices', async function () {
      // Example 16: Error handling best practices
      try {
        await helper.createMock3DS('unknown-strategy');
        assert.fail('Expected error for unknown strategy');
      } catch (error) {
        assert.strictEqual(error.message, 'Unknown strategy type: unknown-strategy');
        console.log('✅ Error handling best practices test passed');
      }
    });

    it('should demonstrate timeout best practices', async function () {
      // Example 17: Timeout best practices
      const shortTimeout = 100;
      const result = await helper.testTimeout('mock-adyen', shortTimeout);
      
      assert(!result.success);
      assert.strictEqual(result.error, 'timeout');
      
      // Verify timeout occurred within expected range
      const startTime = Date.now();
      await helper.testTimeout('mock-stripe', shortTimeout);
      const elapsed = Date.now() - startTime;
      
      assert(elapsed >= shortTimeout);
      assert(elapsed < shortTimeout + 100); // Allow some margin
      console.log('✅ Timeout best practices test passed');
    });
  });
});