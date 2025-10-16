# frozen_string_literal: true

module ThreeDSecure
  module MockStrategies
    # Mock Stripe Strategy for testing 3DS scenarios without UI interaction
    # This strategy simulates Stripe 3DS flows programmatically for testing purposes
    class MockStripeStrategy
      include ActiveSupport::Callbacks
      define_callbacks :on_complete, :on_error

      PAYMENT_INTENT_STATUS_SUCCEEDED = 'succeeded'.freeze

      attr_reader :three_d_secure, :action_token, :container, :simulate_delay
      attr_accessor :stripe_publishable_key, :stripe_client_secret

      def initialize(three_d_secure:, action_token:)
        @three_d_secure = three_d_secure
        @action_token = action_token
        @simulate_delay = 100 # Default delay for simulation
        @container = nil
        @ready = false
        
        extract_credentials
        mark_ready
      end

      def ready?
        @ready
      end

      def attach(container)
        @container = container
        Rails.logger.debug "Mock Stripe attach called for container: #{container}"

        simulate_stripe_authentication
      end

      def remove
        @container = nil
        Rails.logger.debug "Mock Stripe remove called"
      end

      def simulate_stripe_authentication
        Rails.logger.debug "Simulating Stripe authentication"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          is_payment_intent = stripe_client_secret.start_with?('pi')
          
          mock_result = if is_payment_intent
            {
              paymentIntent: {
                id: 'pi_mock_test_id',
                status: PAYMENT_INTENT_STATUS_SUCCEEDED,
                client_secret: stripe_client_secret
              }
            }
          else
            {
              setupIntent: {
                id: 'seti_mock_test_id',
                status: PAYMENT_INTENT_STATUS_SUCCEEDED,
                client_secret: stripe_client_secret
              }
            }
          end
          
          result_id = mock_result[:paymentIntent]&.dig(:id) || mock_result[:setupIntent]&.dig(:id)
          run_callbacks :on_complete, { id: result_id }
        end
      end

      def set_simulation_delay(delay)
        @simulate_delay = delay
      end

      def simulate_error(error_type = 'card_error')
        Rails.logger.debug "Simulating Stripe error: #{error_type}"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          error = StandardError.new("Mock Stripe #{error_type}")
          error.define_singleton_method(:type) { error_type }
          error.define_singleton_method(:code) { error_type }
          
          run_callbacks :on_error, error
        end
      end

      def simulate_requires_action
        Rails.logger.debug "Simulating Stripe requires action"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          error = StandardError.new('Mock Stripe requires action')
          error.define_singleton_method(:type) { 'card_error' }
          error.define_singleton_method(:code) { 'authentication_required' }
          
          run_callbacks :on_error, error
        end
      end

      def simulate_timeout
        Rails.logger.debug "Simulating Stripe timeout"
        # Don't emit anything, just let it timeout
        # This can be used to test timeout handling
      end

      def simulate_custom_result(custom_result)
        Rails.logger.debug "Simulating Stripe custom result"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          run_callbacks :on_complete, custom_result
        end
      end

      def on_complete(&block)
        set_callback :on_complete, :after, &block
      end

      def on_error(&block)
        set_callback :on_error, :after, &block
      end

      private

      def extract_credentials
        @stripe_publishable_key = action_token.dig('gateway', 'credentials', 'publishable_key')
        @stripe_client_secret = action_token.dig('three_d_secure', 'params', 'client_secret')
      end

      def mark_ready
        @ready = true
      end
    end
  end
end