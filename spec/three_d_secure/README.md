# 3DS Automation Testing for Ruby/Retestly

This directory contains comprehensive tests for automating 3DS (3D Secure) scenarios without UI interaction in Ruby. These tests are designed to replace Selenium-based UI testing with programmatic testing approaches.

## Overview

The 3DS automation testing framework provides:

- **Mock Strategies**: Programmatic implementations of Adyen, Stripe, and other 3DS providers
- **Test Helpers**: Utilities for creating and managing 3DS test scenarios
- **Integration Tests**: Tests that verify 3DS flows work correctly with Recurly's risk system
- **E2E Tests**: End-to-end tests that simulate complete 3DS workflows

## Files

### Core Test Files

- `three_ds_automation_spec.rb` - Main unit tests for 3DS automation
- `three_ds_automation_e2e_spec.rb` - End-to-end integration tests
- `examples/three_ds_automation_examples_spec.rb` - Usage examples

### Mock Strategies

- `support/three_d_secure/mock_strategies/mock_adyen_strategy.rb` - Mock Adyen 3DS strategy
- `support/three_d_secure/mock_strategies/mock_stripe_strategy.rb` - Mock Stripe 3DS strategy

### Helper Classes

- `support/three_d_secure/three_ds_automation_helper.rb` - Main automation helper class
- `support/three_d_secure/test_configuration.rb` - Test configuration and utilities

## Usage

### Basic Usage

```ruby
require 'support/three_d_secure/three_ds_automation_helper'

helper = ThreeDSecure::ThreeDSAutomationHelper.new

# Test successful authentication
result = helper.test_successful_authentication('mock-adyen')
puts result[:success] # true
puts result[:token] # { type: 'three_d_secure_action_result', id: '...' }

# Test error scenarios
error_result = helper.test_failed_authentication('mock-stripe', 'card_error')
puts error_result[:success] # false

# Cleanup
helper.cleanup
```

### Advanced Usage

```ruby
# Custom configuration
three_d_secure, strategy = helper.create_mock_3ds('mock-adyen', {
  fingerprint_token: 'custom-token',
  challenge_token: 'custom-challenge'
})

# Set custom simulation delay
strategy.set_simulation_delay(500)

# Test multiple scenarios
scenarios = [
  {
    name: 'Success Test',
    strategy_type: 'mock-adyen',
    test_type: 'success'
  },
  {
    name: 'Error Test',
    strategy_type: 'mock-stripe',
    test_type: 'error',
    options: { error_type: 'card_error' }
  }
]

results = helper.test_multiple_scenarios(scenarios)
stats = helper.get_test_statistics(results)
puts "Success rate: #{stats[:successful]}/#{stats[:total]}"
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

```ruby
helper = ThreeDSecure::ThreeDSAutomationHelper.new(
  recurly: custom_recurly_instance,  # Custom Recurly instance
  default_timeout: 5000,            # Default test timeout
  container: custom_container       # Custom DOM container
)
```

### Strategy Options

```ruby
# Adyen options
adyen_options = {
  fingerprint_token: 'test-fingerprint-token',
  challenge_token: 'test-challenge-token',
  action_token_id: 'custom-action-token'
}

# Stripe options
stripe_options = {
  client_secret: 'pi_test_stripe_client_secret',
  publishable_key: 'pk_test_stripe_key'
}
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

```ruby
# High-frequency testing
request_count = 100
results = []

request_count.times do |i|
  result = helper.test_successful_authentication('mock-adyen')
  results << result
end

successful = results.select { |r| r[:success] }
puts "Success rate: #{successful.length}/#{request_count}"
```

## Integration with Existing Tests

The automation framework integrates seamlessly with existing Recurly tests:

```ruby
# In existing test files
require 'support/three_d_secure/three_ds_automation_helper'

RSpec.describe 'Existing 3DS Tests' do
  let(:helper) { ThreeDSecure::ThreeDSAutomationHelper.new(recurly: recurly) }
  
  after do
    helper.cleanup
  end
  
  it 'should work with existing test setup' do
    result = helper.test_successful_authentication('mock-adyen')
    expect(result[:success]).to be true
  end
end
```

## RSpec Integration

### Basic RSpec Setup

```ruby
# spec/rails_helper.rb
require 'support/three_d_secure/three_ds_automation_helper'

RSpec.configure do |config|
  config.include ThreeDSecure::ThreeDSAutomationHelper, type: :model
end
```

### Test Examples

```ruby
RSpec.describe '3DS Automation', type: :model do
  let(:helper) { described_class.new }
  
  after { helper.cleanup }
  
  it 'should test successful authentication' do
    result = helper.test_successful_authentication('mock-adyen')
    expect(result[:success]).to be true
  end
end
```

## Configuration Management

### Using Test Configuration

```ruby
# Access predefined configurations
config = ThreeDSecure::TestConfiguration.strategies['mock-adyen']
puts config[:error_types] # ['auth-error', 'network-error', 'validation-error']

# Generate test data
token = ThreeDSecure::TestDataGenerator.generate_action_token('mock-adyen', {
  fingerprint_token: 'custom-token'
})

# Generate test scenarios
scenarios = ThreeDSecure::TestDataGenerator.generate_test_scenarios(10)
```

### Custom Configuration

```ruby
# Create custom test configuration
custom_config = {
  timeouts: { default: 10000, short: 2000 },
  strategies: {
    'custom-adyen' => {
      default_delay: 200,
      error_types: ['custom-error']
    }
  }
}
```

## Best Practices

1. **Always cleanup** - Call `helper.cleanup` after tests
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

```ruby
# Set debug level
Rails.logger.level = :debug

# Or enable specific debug namespaces
Rails.logger.debug "Mock Adyen attach called for container: #{container}"
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

```ruby
# Before (Selenium)
browser.find_element(id: 'adyen-challenge-button').click
browser.wait_for_element(id: 'success-message', timeout: 5)
expect(browser.find_element(id: 'success-message').text).to eq('Success')

# After (Automation)
result = helper.test_successful_authentication('mock-adyen')
expect(result[:success]).to be true
expect(result[:token]).to be_present
```

## Running Tests

### Run All 3DS Automation Tests

```bash
# Run all 3DS automation tests
bundle exec rspec spec/three_d_secure/

# Run specific test files
bundle exec rspec spec/three_d_secure/three_ds_automation_spec.rb
bundle exec rspec spec/three_d_secure/three_ds_automation_e2e_spec.rb

# Run with specific tags
bundle exec rspec spec/three_d_secure/ --tag focus
```

### Run Examples

```bash
# Run example tests
bundle exec rspec spec/three_d_secure/examples/
```

## Dependencies

### Required Gems

```ruby
# Gemfile
gem 'rails', '~> 7.0'
gem 'rspec-rails', '~> 6.0'
gem 'active_support', '~> 7.0'
```

### Optional Gems

```ruby
# For enhanced testing
gem 'factory_bot_rails'
gem 'faker'
gem 'webmock'
gem 'vcr'
```

## Performance Considerations

- Mock strategies use threads for simulation delays
- Cleanup is essential to prevent memory leaks
- Use appropriate timeout values for your test environment
- Consider running tests in parallel for better performance

## Security Considerations

- Never use real payment credentials in tests
- Use mock tokens and test data exclusively
- Ensure test data doesn't contain sensitive information
- Clean up test data after each test run