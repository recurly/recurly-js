# 3DS Automation Testing

This directory contains comprehensive tests for automating 3DS (3D Secure) scenarios without UI interaction. These tests are designed to replace Selenium-based UI testing with programmatic testing approaches.

## Overview

The 3DS automation testing framework provides:

- **Mock Strategies**: Programmatic implementations of Adyen, Stripe, and other 3DS providers
- **Test Helpers**: Utilities for creating and managing 3DS test scenarios
- **Integration Tests**: Tests that verify 3DS flows work correctly with Recurly's risk system
- **E2E Tests**: End-to-end tests that simulate complete 3DS workflows

## Files

### Core Test Files

- `3ds-automation.test.js` - Main unit tests for 3DS automation
- `3ds-automation-e2e.test.js` - End-to-end integration tests
- `helpers/3ds-automation-helper.js` - Test helper utilities

### Mock Strategies

- `strategy/mock-adyen.js` - Mock Adyen 3DS strategy
- `strategy/mock-stripe.js` - Mock Stripe 3DS strategy

## Usage

### Basic Usage

```javascript
import { create3DSAutomationHelper } from './helpers/3ds-automation-helper';

const helper = create3DSAutomationHelper();

// Test successful authentication
const result = await helper.testSuccessfulAuthentication('mock-adyen');
console.log(result.success); // true
console.log(result.token); // { type: 'three_d_secure_action_result', id: '...' }

// Test error scenarios
const errorResult = await helper.testFailedAuthentication('mock-adyen', 'auth-error');
console.log(errorResult.success); // false
console.log(errorResult.error); // Error object

// Cleanup
helper.cleanup();
```

### Advanced Usage

```javascript
// Create custom 3DS instance
const { threeDSecure, strategy } = await helper.createMock3DS('mock-adyen', {
  fingerprintToken: 'custom-token',
  challengeToken: 'custom-challenge'
});

// Set custom simulation delay
strategy.setSimulationDelay(500);

// Test multiple scenarios
const scenarios = [
  {
    name: 'Success Test',
    strategyType: 'mock-adyen',
    testType: 'success'
  },
  {
    name: 'Error Test',
    strategyType: 'mock-stripe',
    testType: 'error',
    options: { errorType: 'card_error' }
  }
];

const results = await helper.testMultipleScenarios(scenarios);
const stats = helper.getTestStatistics(results);
console.log(`Success rate: ${stats.successful}/${stats.total}`);
```

## Test Scenarios

### Supported Test Types

1. **Success Tests** - Test successful 3DS authentication
2. **Error Tests** - Test various error conditions
3. **Timeout Tests** - Test timeout scenarios
4. **Custom Tests** - Test with custom configurations

### Supported Strategies

1. **Mock Adyen** - Simulates Adyen 3DS flows
   - Fingerprint authentication
   - Challenge authentication
   - Redirect flows
   - Error scenarios

2. **Mock Stripe** - Simulates Stripe 3DS flows
   - Payment Intent authentication
   - Setup Intent authentication
   - Card error handling
   - Authentication required scenarios

## Configuration Options

### Helper Options

```javascript
const helper = create3DSAutomationHelper({
  recurly: customRecurlyInstance,  // Custom Recurly instance
  defaultTimeout: 5000,           // Default test timeout
  container: customContainer      // Custom DOM container
});
```

### Strategy Options

```javascript
// Adyen options
const adyenOptions = {
  fingerprintToken: 'test-fingerprint-token',
  challengeToken: 'test-challenge-token',
  actionTokenId: 'custom-action-token'
};

// Stripe options
const stripeOptions = {
  clientSecret: 'pi_test_stripe_client_secret',
  publishableKey: 'pk_test_stripe_key'
};
```

## Error Types

### Adyen Error Types

- `auth-error` - Authentication error
- `network-error` - Network connectivity error
- `validation-error` - Input validation error

### Stripe Error Types

- `card_error` - Card-related error
- `authentication_required` - Additional authentication needed
- `api_error` - API-related error

## Performance Testing

The framework supports performance testing scenarios:

```javascript
// High-frequency testing
const requestCount = 100;
const promises = [];

for (let i = 0; i < requestCount; i++) {
  promises.push(helper.testSuccessfulAuthentication('mock-adyen'));
}

const results = await Promise.allSettled(promises);
const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
console.log(`Success rate: ${successful.length}/${requestCount}`);
```

## Integration with Existing Tests

The automation framework integrates seamlessly with existing Recurly tests:

```javascript
// In existing test files
import { create3DSAutomationHelper } from './helpers/3ds-automation-helper';

describe('Existing 3DS Tests', function() {
  let helper;
  
  beforeEach(function() {
    helper = create3DSAutomationHelper({ recurly: this.recurly });
  });
  
  afterEach(function() {
    helper.cleanup();
  });
  
  it('should work with existing test setup', async function() {
    const result = await helper.testSuccessfulAuthentication('mock-adyen');
    assert(result.success);
  });
});
```

## Best Practices

1. **Always cleanup** - Call `helper.cleanup()` after tests
2. **Use descriptive test names** - Make test purposes clear
3. **Test error scenarios** - Don't just test success paths
4. **Use appropriate timeouts** - Set reasonable timeout values
5. **Mock external dependencies** - Don't rely on real payment providers

## Troubleshooting

### Common Issues

1. **Test timeouts** - Increase timeout values or check for infinite loops
2. **Memory leaks** - Ensure proper cleanup of 3DS instances
3. **Race conditions** - Use appropriate delays and synchronization

### Debug Mode

Enable debug logging:

```javascript
// Set debug environment variable
process.env.DEBUG = 'recurly:risk:three-d-secure:*';

// Or enable specific debug namespaces
process.env.DEBUG = 'recurly:risk:three-d-secure:mock-adyen,recurly:risk:three-d-secure:mock-stripe';
```

## Contributing

When adding new mock strategies or test scenarios:

1. Follow the existing pattern for mock strategies
2. Add comprehensive test coverage
3. Update this documentation
4. Ensure backward compatibility

## Migration from Selenium Tests

To migrate existing Selenium-based 3DS tests:

1. Replace Selenium interactions with mock strategy calls
2. Use the automation helper for common test patterns
3. Convert UI-based assertions to programmatic checks
4. Update test data to use mock tokens and responses

Example migration:

```javascript
// Before (Selenium)
browser.click('#adyen-challenge-button');
browser.waitForVisible('#success-message', 5000);
assert(browser.getText('#success-message') === 'Success');

// After (Automation)
const result = await helper.testSuccessfulAuthentication('mock-adyen');
assert(result.success);
assert(result.token);
```