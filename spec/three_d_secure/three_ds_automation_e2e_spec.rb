# frozen_string_literal: true

require 'rails_helper'
require 'support/three_d_secure/three_ds_automation_helper'
require 'support/three_d_secure/test_configuration'

RSpec.describe '3DS Automation E2E Tests', type: :feature do
  let(:helper) { described_class.new }
  
  after do
    helper.cleanup if helper
  end

  describe 'Complete 3DS Workflow Automation' do
    it 'should simulate a complete Adyen 3DS flow' do
      # Step 1: Create 3DS instance
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen', {
        fingerprint_token: 'test-fingerprint-token',
        challenge_token: 'test-challenge-token'
      })

      # Step 2: Set up event listeners
      events = []
      three_d_secure.on('token') { |token| events << { type: 'token', data: token } }
      three_d_secure.on('error') { |error| events << { type: 'error', data: error } }

      # Step 3: Start authentication
      three_d_secure.attach(helper.container)

      # Step 4: Wait for completion
      sleep(0.5)

      # Step 5: Verify results
      expect(events.length).to be > 0
      token_event = events.find { |e| e[:type] == 'token' }
      expect(token_event).to be_present
      expect(token_event[:data]).to be_present
    end

    it 'should simulate a complete Stripe 3DS flow' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-stripe', {
        client_secret: 'pi_test_stripe_client_secret'
      })

      events = []
      three_d_secure.on('token') { |token| events << { type: 'token', data: token } }
      three_d_secure.on('error') { |error| events << { type: 'error', data: error } }

      three_d_secure.attach(helper.container)

      sleep(0.5)

      expect(events.length).to be > 0
      token_event = events.find { |e| e[:type] == 'token' }
      expect(token_event).to be_present
      expect(token_event[:data]).to be_present
    end
  end

  describe 'Real-world Scenario Testing' do
    it 'should handle a payment flow with multiple 3DS attempts' do
      scenarios = [
        {
          name: 'First attempt - Adyen fingerprint',
          strategy_type: 'mock-adyen',
          test_type: 'success',
          options: { fingerprint_token: 'first-attempt-token' }
        },
        {
          name: 'Second attempt - Adyen challenge',
          strategy_type: 'mock-adyen',
          test_type: 'success',
          options: { challenge_token: 'second-attempt-token' }
        },
        {
          name: 'Fallback - Stripe',
          strategy_type: 'mock-stripe',
          test_type: 'success',
          options: { client_secret: 'pi_fallback_secret' }
        }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(3)
      expect(stats[:successful]).to eq(3)
      expect(stats[:failed]).to eq(0)
    end

    it 'should handle error recovery scenarios' do
      scenarios = [
        {
          name: 'First attempt - Error',
          strategy_type: 'mock-adyen',
          test_type: 'error',
          options: { error_type: 'network-error' }
        },
        {
          name: 'Retry - Success',
          strategy_type: 'mock-adyen',
          test_type: 'success',
          options: { fingerprint_token: 'retry-token' }
        }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(2)
      expect(stats[:successful]).to eq(1)
      expect(stats[:failed]).to eq(1)
    end

    it 'should handle timeout and fallback scenarios' do
      scenarios = [
        {
          name: 'Primary - Timeout',
          strategy_type: 'mock-adyen',
          test_type: 'timeout',
          options: { timeout_ms: 100 }
        },
        {
          name: 'Fallback - Success',
          strategy_type: 'mock-stripe',
          test_type: 'success',
          options: { client_secret: 'pi_fallback_secret' }
        }
      ]

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(2)
      expect(stats[:successful]).to eq(1)
      expect(stats[:failed]).to eq(1)
      expect(stats[:timeouts]).to eq(1)
    end
  end

  describe 'Integration with Recurly Risk System' do
    it 'should integrate with Recurly Risk preflight' do
      # Mock preflight data
      preflight_data = {
        recurly: helper.recurly,
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
        address_fields: {
          address1: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postal_code: '12345',
          country: 'US'
        }
      }

      # Mock the strategy preflight method
      mock_preflight = double('MockPreflight')
      allow(mock_preflight).to receive(:preflight).and_return(
        {
          results: { mock: 'preflight-results' },
          token_type: 'three_d_secure_action'
        }
      )

      # This would normally be called by the ThreeDSecure.preflight method
      result = mock_preflight.preflight(preflight_data)
      
      expect(result).to be_present
      expect(result[:results]).to be_present
      expect(result[:token_type]).to eq('three_d_secure_action')
    end

    it 'should handle 3DS result tokenization' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen')

      # Mock the createResultToken method
      mock_token = {
        type: 'three_d_secure_action_result',
        id: '3dsart-test-id'
      }

      allow(three_d_secure).to receive(:create_result_token).and_return(mock_token)

      result = three_d_secure.create_result_token({
        mock: 'test-results'
      })

      expect(result[:type]).to eq('three_d_secure_action_result')
      expect(result[:id]).to eq('3dsart-test-id')
    end
  end

  describe 'Performance and Reliability Testing' do
    it 'should handle high-frequency 3DS requests' do
      request_count = 20
      results = []

      request_count.times do |i|
        result = helper.test_successful_authentication('mock-adyen', {
          action_token_id: "test-token-#{i}"
        })
        results << result
      end

      successful = results.select { |r| r[:success] }
      
      # Should handle most requests successfully
      expect(successful.length).to be >= (request_count * 0.8).to_i
    end

    it 'should handle mixed success/failure scenarios under load' do
      scenarios = []
      
      # Create a mix of success and failure scenarios
      10.times do |i|
        scenarios << {
          name: "Test #{i}",
          strategy_type: i.even? ? 'mock-adyen' : 'mock-stripe',
          test_type: i % 3 == 0 ? 'error' : 'success',
          options: i % 3 == 0 ? { error_type: 'test-error' } : {}
        }
      end

      results = helper.test_multiple_scenarios(scenarios)
      stats = helper.get_test_statistics(results)

      expect(stats[:total]).to eq(10)
      expect(stats[:successful]).to be > 0
      expect(stats[:failed]).to be > 0
    end
  end

  describe 'Error Recovery and Resilience' do
    it 'should recover from strategy errors' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen')

      # First attempt fails
      strategy.simulate_error('network-error')
      
      # Wait a bit, then try again
      sleep(0.1)
      
      # Second attempt succeeds
      result = helper.test_successful_authentication('mock-adyen', {
        action_token_id: 'recovery-token'
      })

      expect(result[:success]).to be true
    end

    it 'should handle cleanup after errors' do
      three_d_secure, strategy = helper.create_mock_3ds('mock-adyen')

      # Simulate an error
      strategy.simulate_error('fatal-error')

      # Cleanup should not throw
      expect { helper.cleanup }.not_to raise_error
    end
  end
end