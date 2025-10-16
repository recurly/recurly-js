# frozen_string_literal: true

module ThreeDSecure
  # Configuration class for 3DS automation tests
  class TestConfiguration
    class << self
      # Default test timeouts
      def timeouts
        {
          default: 5000,
          short: 1000,
          long: 10000
        }
      end

      # Mock strategy configurations
      def strategies
        {
          'mock-adyen' => {
            default_delay: 100,
            error_types: %w[auth-error network-error validation-error],
            supported_flows: %w[fingerprint challenge redirect]
          },
          'mock-stripe' => {
            default_delay: 100,
            error_types: %w[card_error api_error authentication_required],
            supported_flows: %w[payment_intent setup_intent]
          }
        }
      end

      # Test scenario templates
      def scenarios
        {
          success: {
            adyen: {
              fingerprint: {
                strategy_type: 'mock-adyen',
                test_type: 'success',
                options: { fingerprint_token: 'test-fingerprint-token' }
              },
              challenge: {
                strategy_type: 'mock-adyen',
                test_type: 'success',
                options: { challenge_token: 'test-challenge-token' }
              }
            },
            stripe: {
              payment_intent: {
                strategy_type: 'mock-stripe',
                test_type: 'success',
                options: { client_secret: 'pi_test_stripe_client_secret' }
              },
              setup_intent: {
                strategy_type: 'mock-stripe',
                test_type: 'success',
                options: { client_secret: 'seti_test_stripe_client_secret' }
              }
            }
          },
          error: {
            adyen: {
              auth_error: {
                strategy_type: 'mock-adyen',
                test_type: 'error',
                options: { error_type: 'auth-error' }
              },
              network_error: {
                strategy_type: 'mock-adyen',
                test_type: 'error',
                options: { error_type: 'network-error' }
              }
            },
            stripe: {
              card_error: {
                strategy_type: 'mock-stripe',
                test_type: 'error',
                options: { error_type: 'card_error' }
              },
              auth_required: {
                strategy_type: 'mock-stripe',
                test_type: 'error',
                options: { error_type: 'authentication_required' }
              }
            }
          },
          timeout: {
            short: {
              strategy_type: 'mock-adyen',
              test_type: 'timeout',
              options: { timeout_ms: 100 }
            },
            medium: {
              strategy_type: 'mock-stripe',
              test_type: 'timeout',
              options: { timeout_ms: 500 }
            }
          }
        }
      end

      # Performance test configurations
      def performance
        {
          load_test: {
            request_count: 20,
            concurrency: 5
          },
          stress_test: {
            request_count: 100,
            concurrency: 10
          }
        }
      end
    end
  end

  # Test data generators
  class TestDataGenerator
    class << self
      # Generates mock action tokens for different scenarios
      # @param strategy_type [String] Type of strategy
      # @param options [Hash] Configuration options
      # @return [Hash] Mock action token
      def generate_action_token(strategy_type, options = {})
        base_token = {
          'id' => options[:id] || "action-token-#{strategy_type}-#{Time.current.to_i}",
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

      # Generates test scenarios for batch testing
      # @param count [Integer] Number of scenarios to generate
      # @param options [Hash] Additional options
      # @return [Array] Array of test scenarios
      def generate_test_scenarios(count = 10, options = {})
        scenarios = []
        strategy_types = %w[mock-adyen mock-stripe]
        test_types = %w[success error timeout]

        count.times do |i|
          strategy_type = strategy_types[i % strategy_types.length]
          test_type = test_types[i % test_types.length]
          
          scenarios << {
            name: "Test #{i + 1}",
            strategy_type: strategy_type,
            test_type: test_type,
            options: {
              action_token_id: "test-token-#{i}",
              **options
            }
          }
        end

        scenarios
      end
    end
  end

  # Test utilities
  class TestUtils
    class << self
      # Creates a test suite for a specific strategy
      # @param strategy_type [String] Type of strategy
      # @return [Hash] Test suite configuration
      def create_strategy_test_suite(strategy_type)
        {
          success: -> { TestConfiguration.scenarios[:success][strategy_type.to_sym] || {} },
          error: -> { TestConfiguration.scenarios[:error][strategy_type.to_sym] || {} },
          timeout: -> { TestConfiguration.scenarios[:timeout] }
        }
      end

      # Validates test results
      # @param results [Array] Array of test results
      # @param expected_count [Integer] Expected number of results
      # @return [Hash] Statistics object
      def validate_results(results, expected_count = nil)
        stats = {
          total: results.length,
          successful: results.count { |r| r[:success] },
          failed: results.count { |r| !r[:success] }
        }

        if expected_count && stats[:total] != expected_count
          raise ArgumentError, "Expected #{expected_count} results, got #{stats[:total]}"
        end

        stats
      end

      # Creates performance test configuration
      # @param type [Symbol] Type of performance test
      # @return [Hash] Performance test configuration
      def create_performance_test(type = :load_test)
        config = TestConfiguration.performance[type]
        raise ArgumentError, "Unknown performance test type: #{type}" unless config

        {
          **config,
          scenarios: TestDataGenerator.generate_test_scenarios(config[:request_count])
        }
      end
    end
  end
end