# frozen_string_literal: true

require 'rails_helper'
require 'support/three_d_secure/three_ds_automation_helper'
require 'support/three_d_secure/test_configuration'

RSpec.describe ThreeDSecure::ThreeDSAutomationHelper, type: :model do
  let(:helper) { described_class.new }
  
  after do
    helper.cleanup if helper
  end

  describe 'Adyen 3DS Automation' do
    it 'should successfully complete fingerprint authentication' do
      result = helper.test_successful_authentication('mock-adyen', {
        fingerprint_token: 'test-fingerprint-token'
      })

      expect(result[:success]).to be true
      expect(result[:token]).to be_present
      expect(result[:strategy]).to be_present
    end

    it 'should successfully complete challenge authentication' do
      result = helper.test_successful_authentication('mock-adyen', {
        challenge_token: 'test-challenge-token'
      })

      expect(result[:success]).to be true
      expect(result[:token]).to be_present
    end

    it 'should handle authentication errors' do
      result = helper.test_failed_authentication('mock-adyen', 'auth-error')

      expect(result[:success]).to be false
      expect(result[:error]).to be_present
      expect(result[:error].code).to eq('auth-error')
    end

    it 'should handle timeout scenarios' do
      result = helper.test_timeout('mock-adyen', 500)

      expect(result[:success]).to be false
      expect(result[:error]).to eq('timeout')
    end

    it 'should handle different error types' do
      error_types = %w[auth-error network-error validation-error]
      
      error_types.each do |error_type|
        result = helper.test_failed_authentication('mock-adyen', error_type)
        expect(result[:success]).to be false
        expect(result[:error]).to be_present
      end
    end
  end

  describe 'Stripe 3DS Automation' do
    it 'should successfully complete payment intent authentication' do
      result = helper.test_successful_authentication('mock-stripe', {
        client_secret: 'pi_test_stripe_client_secret'
      })

      expect(result[:success]).to be true
      expect(result[:token]).to be_present
      expect(result[:strategy]).to be_present
    end

    it 'should successfully complete setup intent authentication' do
      result = helper.test_successful_authentication('mock-stripe', {
        client_secret: 'seti_test_stripe_client_secret'
      })

      expect(result[:success]).to be true
      expect(result[:token]).to be_present
    end

    it 'should handle card errors' do
      result = helper.test_failed_authentication('mock-stripe', 'card_error')

      expect(result[:success]).to be false
      expect(result[:error]).to be_present
      expect(result[:error].code).to eq('card_error')
    end

    it 'should handle authentication required errors' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-stripe').values_at(:three_d_secure, :strategy)
      
      expect do
        three_d_secure.attach(helper.container)
        
        # Simulate requires action
        strategy.simulate_requires_action
        
        # Wait for error
        sleep(0.2)
      end.not_to raise_error
    end
  end

  describe 'Multiple Scenario Testing' do
    it 'should test multiple scenarios in sequence' do
      scenarios = [
        {
          name: 'Adyen Success',
          strategy_type: 'mock-adyen',
          test_type: 'success',
          options: { fingerprint_token: 'test-token' }
        },
        {
          name: 'Stripe Success',
          strategy_type: 'mock-stripe',
          test_type: 'success',
          options: { client_secret: 'pi_test_secret' }
        },
        {
          name: 'Adyen Error',
          strategy_type: 'mock-adyen',
          test_type: 'error',
          options: { error_type: 'auth-error' }
        },
        {
          name: 'Stripe Timeout',
          strategy_type: 'mock-stripe',
          test_type: 'timeout',
          options: { timeout_ms: 200 }
        }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      
      expect(results.length).to eq(4)
      
      stats = helper.get_test_statistics(results)
      expect(stats[:total]).to eq(4)
      expect(stats[:successful]).to eq(2)
      expect(stats[:failed]).to eq(2)
      expect(stats[:timeouts]).to eq(1)
      expect(stats[:errors]).to eq(1)
    end

    it 'should handle mixed success and failure scenarios' do
      scenarios = [
        { name: 'Success 1', strategy_type: 'mock-adyen', test_type: 'success' },
        { name: 'Error 1', strategy_type: 'mock-adyen', test_type: 'error' },
        { name: 'Success 2', strategy_type: 'mock-stripe', test_type: 'success' },
        { name: 'Timeout 1', strategy_type: 'mock-stripe', test_type: 'timeout', options: { timeout_ms: 100 } }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)
      
      expect(stats[:total]).to eq(4)
      expect(stats[:successful]).to eq(2)
      expect(stats[:failed]).to eq(2)
    end
  end

  describe 'Custom Strategy Configuration' do
    it 'should allow custom simulation delays' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen')
      
      # Set a custom delay
      strategy.set_simulation_delay(200)
      
      start_time = Time.current
      
      three_d_secure.on('token') do |token|
        elapsed = (Time.current - start_time) * 1000
        
        # Should take at least 200ms due to our custom delay
        expect(elapsed).to be >= 200
        expect(token).to be_present
      end

      three_d_secure.attach(helper.container)
      
      # Wait for completion
      sleep(0.5)
    end

    it 'should allow custom result simulation' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-stripe')
      
      custom_result = { id: 'custom_test_id', custom_field: 'custom_value' }
      
      three_d_secure.on('token') do |token|
        expect(token).to eq(custom_result)
      end

      three_d_secure.attach(helper.container)
      
      # Simulate custom result
      strategy.simulate_custom_result(custom_result)
      
      # Wait for completion
      sleep(0.2)
    end
  end

  describe 'Error Handling and Edge Cases' do
    it 'should handle strategy creation errors' do
      expect do
        helper.create_mock_3ds('unknown-strategy')
      end.to raise_error(ArgumentError, 'Unknown strategy type: unknown-strategy')
    end

    it 'should handle cleanup properly' do
      # Create multiple instances
      promises = [
        helper.create_mock_3ds('mock-adyen'),
        helper.create_mock_3ds('mock-stripe'),
        helper.create_mock_3ds('mock-adyen', { action_token_id: 'test-2' })
      ]

      # Verify instances were created
      expect(helper.strategies.size).to be > 0

      # Cleanup should not throw errors
      expect { helper.cleanup }.not_to raise_error
      
      # Strategies should be cleared
      expect(helper.strategies.size).to eq(0)
    end

    it 'should handle concurrent test execution' do
      promises = [
        helper.test_successful_authentication('mock-adyen'),
        helper.test_successful_authentication('mock-stripe'),
        helper.test_failed_authentication('mock-adyen', 'auth-error')
      ]

      results = promises.map do |promise|
        begin
          promise
        rescue => error
          { success: false, error: error.message }
        end
      end
      
      # All tests should complete (some may succeed, some may fail)
      expect(results.length).to eq(3)
      
      # At least one should succeed
      successful = results.select { |r| r[:success] }
      expect(successful.length).to be > 0
    end
  end

  describe 'Performance and Load Testing' do
    it 'should handle rapid sequential tests' do
      test_count = 10
      results = []
      
      test_count.times do |i|
        result = helper.test_successful_authentication('mock-adyen')
        results << result
      end
      
      expect(results.length).to eq(test_count)
      results.each do |result|
        expect(result[:success]).to be true
      end
    end

    it 'should handle concurrent load testing' do
      test_count = 5
      promises = []
      
      test_count.times do |i|
        promises << helper.test_successful_authentication('mock-adyen')
      end
      
      results = promises
      
      expect(results.length).to eq(test_count)
      results.each do |result|
        expect(result[:success]).to be true
      end
    end
  end
end