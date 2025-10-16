# frozen_string_literal: true

module ThreeDSecure
  module MockStrategies
    # Mock Adyen Strategy for testing 3DS scenarios without UI interaction
    # This strategy simulates Adyen 3DS flows programmatically for testing purposes
    class MockAdyenStrategy
      include ActiveSupport::Callbacks
      define_callbacks :on_complete, :on_error

      attr_reader :three_d_secure, :action_token, :container, :simulate_delay
      attr_accessor :should_fingerprint, :should_challenge, :should_redirect

      def initialize(three_d_secure:, action_token:)
        @three_d_secure = three_d_secure
        @action_token = action_token
        @simulate_delay = 100 # Default delay for simulation
        @container = nil
        @ready = false
        
        determine_authentication_method
        mark_ready
      end

      def ready?
        @ready
      end

      def attach(container)
        @container = container
        Rails.logger.debug "Mock Adyen attach called for container: #{container}"

        if should_fingerprint
          simulate_fingerprint
        elsif should_challenge
          simulate_challenge
        elsif should_redirect
          simulate_redirect
        else
          error = StandardError.new('We could not determine an authentication method')
          three_d_secure.error('3ds-auth-determination-error', cause: error)
        end
      end

      def remove
        @container = nil
        Rails.logger.debug "Mock Adyen remove called"
      end

      def simulate_fingerprint
        Rails.logger.debug "Simulating Adyen fingerprinting"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          mock_results = {
            data: {
              details: {
                'threeds2.fingerprint' => 'mock-fingerprint-data',
                'threeds2.challengeResult' => 'mock-challenge-result'
              }
            }
          }
          
          run_callbacks :on_complete, mock_results
        end
      end

      def simulate_challenge
        Rails.logger.debug "Simulating Adyen challenge"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          mock_results = {
            data: {
              details: {
                'threeds2.challengeResult' => 'mock-challenge-success',
                'threeds2.fingerprint' => 'mock-fingerprint-data'
              }
            }
          }
          
          run_callbacks :on_complete, mock_results
        end
      end

      def simulate_redirect
        Rails.logger.debug "Simulating Adyen redirect"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          mock_results = {
            redirect_url: adyen_redirect_params[:redirect_url],
            pa_req: adyen_redirect_params[:pa_req],
            md: adyen_redirect_params[:md],
            status: 'success'
          }
          
          run_callbacks :on_complete, mock_results
        end
      end

      def set_simulation_delay(delay)
        @simulate_delay = delay
      end

      def simulate_error(error_type = 'auth-error')
        Rails.logger.debug "Simulating Adyen error: #{error_type}"
        
        Thread.new do
          sleep(simulate_delay / 1000.0)
          
          error = StandardError.new("Mock Adyen #{error_type}")
          error.define_singleton_method(:code) { error_type }
          
          run_callbacks :on_error, error
        end
      end

      def simulate_timeout
        Rails.logger.debug "Simulating Adyen timeout"
        # Don't emit anything, just let it timeout
        # This can be used to test timeout handling
      end

      def on_complete(&block)
        set_callback :on_complete, :after, &block
      end

      def on_error(&block)
        set_callback :on_error, :after, &block
      end

      private

      def determine_authentication_method
        @should_fingerprint = !adyen_fingerprint_token.nil?
        @should_challenge = !adyen_challenge_token.nil?
        @should_redirect = !adyen_redirect_params.nil?
      end

      def adyen_fingerprint_token
        authentication = action_token.dig('three_d_secure', 'params', 'authentication')
        authentication&.dig('threeds2.fingerprintToken')
      end

      def adyen_challenge_token
        authentication = action_token.dig('three_d_secure', 'params', 'authentication')
        authentication&.dig('threeds2.challengeToken')
      end

      def adyen_redirect_params
        three_d_secure_params = action_token.dig('three_d_secure', 'params')
        
        if three_d_secure_params['type'] == 'redirect'
          data = three_d_secure_params['data']
          {
            redirect_url: three_d_secure_params['url'],
            pa_req: data&.dig('PaReq'),
            md: data&.dig('MD')
          }.compact
        else
          redirect_params = three_d_secure_params['redirect']
          return nil unless redirect_params
          
          {
            redirect_url: redirect_params['url'],
            pa_req: redirect_params.dig('data', 'pa_req') || redirect_params.dig('data', 'PaReq'),
            md: redirect_params.dig('data', 'md') || redirect_params.dig('data', 'MD')
          }
        end
      end

      def mark_ready
        @ready = true
      end
    end
  end
end