# frozen_string_literal: true

module ThreeDSecure
  # Helper class for automating 3DS scenarios without UI interaction
  # This class provides utilities to test 3DS flows programmatically
  class ThreeDSAutomationHelper
    include ActiveSupport::Callbacks
    define_callbacks :on_test_complete, :on_test_error

    attr_reader :recurly, :default_timeout, :container, :strategies

    def initialize(options = {})
      @recurly = options[:recurly] || create_mock_recurly
      @default_timeout = options[:default_timeout] || 5000
      @container = options[:container] || create_mock_container
      @strategies = {}
    end

    # Creates a mock 3DS instance with a specific strategy
    # @param strategy_type [String] Type of strategy ('mock-adyen', 'mock-stripe', etc.)
    # @param options [Hash] Configuration options
    # @return [Hash] Hash containing 3DS instance and strategy
    def create_mock_3ds(strategy_type, options = {})
      action_token_id = options[:action_token_id] || "action-token-#{strategy_type}"
      
      # Create a mock action token
      mock_action_token = create_mock_action_token(strategy_type, options)
      
      # Mock the token request
      mock_token_request(mock_action_token)
      
      # Create 3DS instance (this would normally be done through Recurly's API)
      three_d_secure = create_three_d_secure_instance(action_token_id)
      
      # Wait for the 3DS instance to be ready
      wait_for_ready(three_d_secure)
      
      # Replace the strategy with our mock
      mock_strategy = create_mock_strategy(strategy_type, three_d_secure, mock_action_token)
      three_d_secure.strategy = mock_strategy
      
      @strategies[action_token_id] = { three_d_secure: three_d_secure, strategy: mock_strategy }
      
      { three_d_secure: three_d_secure, strategy: mock_strategy }
    end

    # Tests a successful 3DS authentication flow
    # @param strategy_type [String] Type of strategy to test
    # @param options [Hash] Test options
    # @return [Hash] Hash containing test results
    def test_successful_authentication(strategy_type, options = {})
      three_d_secure, strategy = create_mock_3ds(strategy_type, options).values_at(:three_d_secure, :strategy)
      
      result = nil
      error = nil
      
      # Set up event listeners
      three_d_secure.on('token') { |token| result = { success: true, token: token, strategy: strategy } }
      three_d_secure.on('error') { |err| error = err }
      
      # Start the authentication process
      three_d_secure.attach(container)
      
      # Wait for completion with timeout
      wait_with_timeout(default_timeout) do
        result || error
      end
      
      raise error if error
      result
    end

    # Tests a failed 3DS authentication flow
    # @param strategy_type [String] Type of strategy to test
    # @param error_type [String] Type of error to simulate
    # @param options [Hash] Test options
    # @return [Hash] Hash containing error details
    def test_failed_authentication(strategy_type, error_type = 'auth-error', options = {})
      three_d_secure, strategy = create_mock_3ds(strategy_type, options).values_at(:three_d_secure, :strategy)
      
      result = nil
      error = nil
      
      # Set up event listeners
      three_d_secure.on('token') { |token| result = { success: true, token: token, strategy: strategy } }
      three_d_secure.on('error') { |err| error = { success: false, error: err, strategy: strategy } }
      
      # Start the authentication process
      three_d_secure.attach(container)
      
      # Simulate the error after a short delay
      Thread.new do
        sleep(0.05)
        strategy.simulate_error(error_type)
      end
      
      # Wait for completion with timeout
      wait_with_timeout(default_timeout) do
        result || error
      end
      
      raise StandardError.new('Expected error but got success') if result&.dig(:success)
      error
    end

    # Tests a timeout scenario
    # @param strategy_type [String] Type of strategy to test
    # @param timeout_ms [Integer] Timeout in milliseconds
    # @param options [Hash] Test options
    # @return [Hash] Hash containing timeout result
    def test_timeout(strategy_type, timeout_ms = 1000, options = {})
      three_d_secure, strategy = create_mock_3ds(strategy_type, options).values_at(:three_d_secure, :strategy)
      
      result = nil
      error = nil
      
      # Set up event listeners
      three_d_secure.on('token') { |token| result = { success: true, token: token, strategy: strategy } }
      three_d_secure.on('error') { |err| error = { success: false, error: err, strategy: strategy } }
      
      # Start the authentication process
      three_d_secure.attach(container)
      
      # Simulate timeout by not calling any completion methods
      strategy.simulate_timeout
      
      # Wait for timeout
      begin
        wait_with_timeout(timeout_ms) do
          result || error
        end
      rescue Timeout::Error
        return { success: false, error: 'timeout', strategy: strategy }
      end
      
      raise StandardError.new('Expected timeout but got result') if result || error
    end

    # Tests multiple 3DS scenarios in sequence
    # @param scenarios [Array] Array of scenario configurations
    # @return [Array] Array of results
    def test_multiple_scenarios(scenarios)
      results = []
      
      scenarios.each do |scenario|
        begin
          result = test_scenario(scenario)
          results << result.merge(scenario: scenario[:name] || 'unnamed')
        rescue => error
          results << { 
            success: false, 
            error: error.message, 
            scenario: scenario[:name] || 'unnamed' 
          }
        end
      end
      
      results
    end

    # Tests a single scenario based on configuration
    # @param scenario [Hash] Scenario configuration
    # @return [Hash] Scenario result
    def test_scenario(scenario)
      strategy_type = scenario[:strategy_type]
      test_type = scenario[:test_type]
      options = scenario[:options] || {}
      
      case test_type
      when 'success'
        test_successful_authentication(strategy_type, options)
      when 'error'
        test_failed_authentication(strategy_type, options[:error_type], options)
      when 'timeout'
        test_timeout(strategy_type, options[:timeout_ms], options)
      else
        raise ArgumentError, "Unknown test type: #{test_type}"
      end
    end

    # Cleans up all created 3DS instances
    def cleanup
      strategies.each do |action_token_id, data|
        begin
          data[:three_d_secure].remove if data[:three_d_secure].respond_to?(:remove)
        rescue => error
          Rails.logger.warn "Error during cleanup: #{error.message}"
        end
      end
      @strategies.clear
    end

    # Gets statistics about completed tests
    # @param results [Array] Array of test results
    # @return [Hash] Statistics object
    def get_test_statistics(results)
      stats = {
        total: results.length,
        successful: 0,
        failed: 0,
        timeouts: 0,
        errors: 0
      }

      results.each do |result|
        if result[:success]
          stats[:successful] += 1
        else
          stats[:failed] += 1
          if result[:error] == 'timeout'
            stats[:timeouts] += 1
          else
            stats[:errors] += 1
          end
        end
      end

      stats
    end

    private

    def create_mock_recurly
      # This would be replaced with actual Recurly instance in real implementation
      OpenStruct.new(
        request: OpenStruct.new(
          get: ->(params) { mock_token_request(nil) }
        )
      )
    end

    def create_mock_container
      # Mock DOM container for testing
      OpenStruct.new(id: 'three-d-secure-container')
    end

    def create_mock_action_token(strategy_type, options = {})
      base_token = {
        'id' => options[:action_token_id] || "action-token-#{strategy_type}",
        'type' => 'three_d_secure_action',
        'gateway' => {
          'type' => strategy_type,
          'credentials' => {
            'publishable_key' => options[:publishable_key] || 'test-publishable-key'
          }
        },
        'three_d_secure' => {
          'params' => {}
        }
      }

      case strategy_type
      when 'mock-adyen'
        base_token.merge(
          'three_d_secure' => {
            'params' => {
              'authentication' => {
                'threeds2.fingerprintToken' => options[:fingerprint_token] || 'test-fingerprint-token',
                'threeds2.challengeToken' => options[:challenge_token] || 'test-challenge-token'
              }
            }
          }
        )
      when 'mock-stripe'
        base_token.merge(
          'three_d_secure' => {
            'params' => {
              'client_secret' => options[:client_secret] || 'pi_test_stripe_client_secret'
            }
          }
        )
      else
        base_token
      end
    end

    def create_mock_strategy(strategy_type, three_d_secure, action_token)
      case strategy_type
      when 'mock-adyen'
        MockStrategies::MockAdyenStrategy.new(three_d_secure: three_d_secure, action_token: action_token)
      when 'mock-stripe'
        MockStrategies::MockStripeStrategy.new(three_d_secure: three_d_secure, action_token: action_token)
      else
        raise ArgumentError, "Unknown strategy type: #{strategy_type}"
      end
    end

    def create_three_d_secure_instance(action_token_id)
      # Mock 3DS instance that would normally be created by Recurly
      three_d_secure = OpenStruct.new(
        action_token_id: action_token_id,
        strategy: nil,
        container: nil
      )
      
      # Add event handling methods
      three_d_secure.define_singleton_method(:on) do |event, &block|
        case event
        when 'token'
          three_d_secure.define_singleton_method(:trigger_token) { |token| block.call(token) }
        when 'error'
          three_d_secure.define_singleton_method(:trigger_error) { |error| block.call(error) }
        end
      end
      
      three_d_secure.define_singleton_method(:attach) { |container| self.container = container }
      three_d_secure.define_singleton_method(:remove) { self.container = nil }
      three_d_secure.define_singleton_method(:when_ready) { |&block| block.call }
      
      three_d_secure
    end

    def mock_token_request(mock_token)
      # Mock the token request response
      mock_token
    end

    def wait_for_ready(three_d_secure)
      # In a real implementation, this would wait for the 3DS instance to be ready
      # For testing, we'll just return immediately
      three_d_secure.when_ready
    end

    def wait_with_timeout(timeout_ms)
      Timeout.timeout(timeout_ms / 1000.0) do
        loop do
          result = yield
          return result if result
          sleep(0.01)
        end
      end
    end
  end
end