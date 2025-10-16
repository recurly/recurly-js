# frozen_string_literal: true

require 'rails_helper'
require 'support/three_d_secure/three_ds_automation_helper'
require 'support/three_d_secure/test_configuration'

RSpec.describe '3DS Automation Examples', type: :model do
  let(:helper) { described_class.new }
  
  after do
    helper.cleanup if helper
  end

  describe 'Basic Usage Examples' do
    it 'should demonstrate basic successful authentication' do
      # Example 1: Simple success test
      result = helper.test_successful_authentication('mock-adyen')
      
      expect(result[:success]).to be true
      expect(result[:token]).to be_present
      expect(result[:strategy]).to be_present
      puts '✅ Basic success test passed'
    end

    it 'should demonstrate error handling' do
      # Example 2: Error scenario testing
      result = helper.test_failed_authentication('mock-stripe', 'card_error')
      
      expect(result[:success]).to be false
      expect(result[:error]).to be_present
      expect(result[:error].code).to eq('card_error')
      puts '✅ Error handling test passed'
    end

    it 'should demonstrate timeout handling' do
      # Example 3: Timeout scenario testing
      result = helper.test_timeout('mock-adyen', 200)
      
      expect(result[:success]).to be false
      expect(result[:error]).to eq('timeout')
      puts '✅ Timeout handling test passed'
    end
  end

  describe 'Advanced Usage Examples' do
    it 'should demonstrate custom configuration' do
      # Example 4: Custom 3DS instance with specific options
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen', {
        fingerprint_token: 'custom-fingerprint-token',
        challenge_token: 'custom-challenge-token',
        action_token_id: 'custom-action-token'
      })

      # Set custom simulation delay
      strategy.set_simulation_delay(300)

      start_time = Time.current
      
      three_d_secure.on('token') do |token|
        elapsed = (Time.current - start_time) * 1000
        
        # Should take at least 300ms due to custom delay
        expect(elapsed).to be >= 300
        expect(token).to be_present
        puts '✅ Custom configuration test passed'
      end

      three_d_secure.attach(helper.container)
      
      # Wait for completion
      sleep(0.5)
    end

    it 'should demonstrate batch testing' do
      # Example 5: Testing multiple scenarios in batch
      scenarios = [
        {
          name: 'Adyen Success',
          strategy_type: 'mock-adyen',
          test_type: 'success'
        },
        {
          name: 'Stripe Success',
          strategy_type: 'mock-stripe',
          test_type: 'success'
        },
        {
          name: 'Adyen Error',
          strategy_type: 'mock-adyen',
          test_type: 'error',
          options: { error_type: 'auth-error' }
        }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(3)
      expect(stats[:successful]).to eq(2)
      expect(stats[:failed]).to eq(1)
      puts "✅ Batch testing passed: #{stats}"
    end

    it 'should demonstrate performance testing' do
      # Example 6: Performance testing with multiple concurrent requests
      request_count = 5
      results = []

      request_count.times do |i|
        result = helper.test_successful_authentication('mock-adyen')
        results << result
      end

      successful = results.select { |r| r[:success] }
      
      expect(successful.length).to be >= (request_count * 0.8).to_i
      puts "✅ Performance test passed: #{successful.length}/#{request_count} successful"
    end
  end

  describe 'Real-world Scenario Examples' do
    it 'should demonstrate payment flow with fallback' do
      # Example 7: Payment flow with primary and fallback methods
      payment_flow = [
        {
          name: 'Primary - Adyen',
          strategy_type: 'mock-adyen',
          test_type: 'error',
          options: { error_type: 'network-error' }
        },
        {
          name: 'Fallback - Stripe',
          strategy_type: 'mock-stripe',
          test_type: 'success',
          options: { client_secret: 'pi_fallback_secret' }
        }
      ]

      results = helper.test_multiple_scenarios(payment_flow)
      stats = helper.get_test_statistics(results)

      # First attempt should fail, second should succeed
      expect(stats[:total]).to eq(2)
      expect(stats[:failed]).to eq(1)
      expect(stats[:successful]).to eq(1)
      puts '✅ Payment flow with fallback test passed'
    end

    it 'should demonstrate retry logic' do
      # Example 8: Retry logic after initial failure
      retry_scenarios = [
        {
          name: 'First attempt - Error',
          strategy_type: 'mock-adyen',
          test_type: 'error',
          options: { error_type: 'auth-error' }
        },
        {
          name: 'Retry attempt - Success',
          strategy_type: 'mock-adyen',
          test_type: 'success',
          options: { fingerprint_token: 'retry-token' }
        }
      ]

      results = helper.test_multiple_scenarios(retry_scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(2)
      expect(stats[:failed]).to eq(1)
      expect(stats[:successful]).to eq(1)
      puts '✅ Retry logic test passed'
    end

    it 'should demonstrate error recovery' do
      # Example 9: Error recovery and cleanup
      three_d_secure, strategy = helper.create_mock_3ds('mock-stripe')

      # Simulate an error
      strategy.simulate_error('fatal-error')

      # Wait for error to be processed
      sleep(0.1)

      # Cleanup should not throw
      expect { helper.cleanup }.not_to raise_error
      puts '✅ Error recovery test passed'
    end
  end

  describe 'Configuration Examples' do
    it 'should demonstrate using test configuration' do
      # Example 10: Using predefined test configurations
      adyen_config = ThreeDSecure::TestConfiguration.strategies['mock-adyen']
      stripe_config = ThreeDSecure::TestConfiguration.strategies['mock-stripe']

      expect(adyen_config[:error_types]).to include('auth-error')
      expect(stripe_config[:error_types]).to include('card_error')
      expect(adyen_config[:supported_flows]).to include('fingerprint')
      expect(stripe_config[:supported_flows]).to include('payment_intent')

      puts '✅ Configuration usage test passed'
    end

    it 'should demonstrate test data generation' do
      # Example 11: Generating test data
      adyen_token = ThreeDSecure::TestDataGenerator.generate_action_token('mock-adyen', {
        fingerprint_token: 'custom-token'
      })

      stripe_token = ThreeDSecure::TestDataGenerator.generate_action_token('mock-stripe', {
        client_secret: 'pi_custom_secret'
      })

      expect(adyen_token['gateway']['type']).to eq('mock-adyen')
      expect(stripe_token['gateway']['type']).to eq('mock-stripe')
      expect(adyen_token.dig('three_d_secure', 'params', 'authentication', 'threeds2.fingerprintToken')).to be_present
      expect(stripe_token.dig('three_d_secure', 'params', 'client_secret')).to be_present

      puts '✅ Test data generation test passed'
    end

    it 'should demonstrate scenario generation' do
      # Example 12: Generating test scenarios
      scenarios = ThreeDSecure::TestDataGenerator.generate_test_scenarios(5)
      
      expect(scenarios.length).to eq(5)
      scenarios.each_with_index do |scenario, index|
        expect(scenario[:name]).to be_present
        expect(scenario[:strategy_type]).to be_present
        expect(scenario[:test_type]).to be_present
        expect(scenario[:options][:action_token_id]).to be_present
      end

      puts '✅ Scenario generation test passed'
    end
  end

  describe 'Integration Examples' do
    it 'should demonstrate integration with existing Recurly tests' do
      # Example 13: Integration with existing test patterns
      recurly = helper.recurly
      
      # Create 3DS instance using Recurly's normal API
      three_d_secure = double('ThreeDSecure')
      allow(three_d_secure).to receive(:action_token_id).and_return('integration-test')
      
      # Mock the token response
      mock_token = ThreeDSecure::TestDataGenerator.generate_action_token('mock-adyen')
      allow(recurly.request).to receive(:get).and_return(mock_token)
      
      # Replace with mock strategy
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen', {
        action_token_id: 'integration-test'
      })

      # Test the integration
      three_d_secure.on('token') do |token|
        expect(token).to be_present
        puts '✅ Integration test passed'
      end

      three_d_secure.attach(helper.container)
      
      # Wait for completion
      sleep(0.2)
    end

    it 'should demonstrate performance testing utilities' do
      # Example 14: Using performance testing utilities
      load_test = ThreeDSecure::TestUtils.create_performance_test(:load_test)
      stress_test = ThreeDSecure::TestUtils.create_performance_test(:stress_test)

      expect(load_test[:request_count]).to be > 0
      expect(stress_test[:request_count]).to be > load_test[:request_count]
      expect(load_test[:scenarios].length).to eq(load_test[:request_count])

      puts '✅ Performance testing utilities test passed'
    end
  end

  describe 'Best Practices Examples' do
    it 'should demonstrate proper cleanup' do
      # Example 15: Proper cleanup practices
      instances = []
      
      # Create multiple instances
      3.times do |i|
        instance = helper.create_mock_3ds('mock-adyen', {
          action_token_id: "cleanup-test-#{i}"
        })
        instances << instance
      end

      # Verify instances were created
      expect(instances.length).to eq(3)
      expect(helper.strategies.size).to be > 0

      # Cleanup
      helper.cleanup

      # Verify cleanup
      expect(helper.strategies.size).to eq(0)
      puts '✅ Proper cleanup test passed'
    end

    it 'should demonstrate error handling best practices' do
      # Example 16: Error handling best practices
      expect do
        helper.create_mock_3ds('unknown-strategy')
      end.to raise_error(ArgumentError, 'Unknown strategy type: unknown-strategy')
      puts '✅ Error handling best practices test passed'
    end

    it 'should demonstrate timeout best practices' do
      # Example 17: Timeout best practices
      short_timeout = 100
      result = helper.test_timeout('mock-adyen', short_timeout)
      
      expect(result[:success]).to be false
      expect(result[:error]).to eq('timeout')
      
      # Verify timeout occurred within expected range
      start_time = Time.current
      helper.test_timeout('mock-stripe', short_timeout)
      elapsed = (Time.current - start_time) * 1000
      
      expect(elapsed).to be >= short_timeout
      expect(elapsed).to be < short_timeout + 100 # Allow some margin
      puts '✅ Timeout best practices test passed'
    end
  end
end