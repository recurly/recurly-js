# frozen_string_literal: true

source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.1.0'

# Core Rails gems
gem 'rails', '~> 7.0.0'
gem 'puma', '~> 5.0'
gem 'bootsnap', '>= 1.4.4', require: false

# Database
gem 'pg', '~> 1.1'

# Authentication and Security
gem 'devise', '~> 4.9'
gem 'bcrypt', '~> 3.1.7'

# Background Jobs
gem 'sidekiq', '~> 7.0'

# HTTP Client
gem 'faraday', '~> 2.0'
gem 'faraday-retry', '~> 2.0'

# JSON Processing
gem 'json', '~> 2.6'
gem 'oj', '~> 3.13'

# Testing Framework
group :development, :test do
  gem 'rspec-rails', '~> 6.0'
  gem 'factory_bot_rails', '~> 6.2'
  gem 'faker', '~> 2.23'
  gem 'shoulda-matchers', '~> 5.3'
  gem 'database_cleaner-active_record', '~> 2.0'
  gem 'webmock', '~> 3.18'
  gem 'vcr', '~> 6.1'
  gem 'timecop', '~> 0.9'
  gem 'simplecov', '~> 0.22', require: false
  gem 'simplecov-lcov', '~> 0.8', require: false
end

# Development Tools
group :development do
  gem 'listen', '~> 3.7'
  gem 'spring', '~> 4.0'
  gem 'spring-watcher-listen', '~> 2.2.0'
  gem 'annotate', '~> 3.2'
  gem 'rubocop', '~> 1.50', require: false
  gem 'rubocop-rspec', '~> 2.20', require: false
  gem 'rubocop-rails', '~> 2.20', require: false
  gem 'brakeman', '~> 5.4', require: false
  gem 'bundler-audit', '~> 0.9', require: false
end

# Production
group :production do
  gem 'redis', '~> 5.0'
  gem 'newrelic_rpm', '~> 9.0'
end

# 3DS Testing Specific
gem 'recurly', '~> 3.0' # If using Recurly gem
gem 'stripe', '~> 8.0' # If using Stripe gem
gem 'adyen-ruby-api-library', '~> 2.0' # If using Adyen gem

# Utilities
gem 'active_support', '~> 7.0'
gem 'activesupport', '~> 7.0'
gem 'concurrent-ruby', '~> 1.2'
gem 'timeout', '~> 0.3'