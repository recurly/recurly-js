# frozen_string_literal: true

# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require_relative 'config/application'

Rails.application.load_tasks

# Custom tasks for 3DS automation testing
namespace :three_ds do
  desc 'Run all 3DS automation tests'
  task :test do
    Rake::Task['spec:three_ds'].invoke
  end

  desc 'Run 3DS automation unit tests'
  task :unit do
    Rake::Task['spec:three_ds:unit'].invoke
  end

  desc 'Run 3DS automation E2E tests'
  task :e2e do
    Rake::Task['spec:three_ds:e2e'].invoke
  end

  desc 'Run 3DS automation examples'
  task :examples do
    Rake::Task['spec:three_ds:examples'].invoke
  end

  desc 'Generate 3DS test coverage report'
  task :coverage do
    ENV['COVERAGE'] = 'true'
    Rake::Task['spec:three_ds'].invoke
  end

  desc 'Clean up 3DS test artifacts'
  task :cleanup do
    puts 'Cleaning up 3DS test artifacts...'
    # Add cleanup logic here if needed
    puts 'Cleanup complete!'
  end
end

namespace :spec do
  namespace :three_ds do
    desc 'Run all 3DS automation tests'
    task all: :environment do
      RSpec::Core::RakeTask.new(:three_ds_all) do |t|
        t.pattern = 'spec/three_d_secure/**/*_spec.rb'
        t.rspec_opts = '--format documentation'
      end
      Rake::Task[:three_ds_all].invoke
    end

    desc 'Run 3DS automation unit tests'
    task unit: :environment do
      RSpec::Core::RakeTask.new(:three_ds_unit) do |t|
        t.pattern = 'spec/three_d_secure/three_ds_automation_spec.rb'
        t.rspec_opts = '--format documentation'
      end
      Rake::Task[:three_ds_unit].invoke
    end

    desc 'Run 3DS automation E2E tests'
    task e2e: :environment do
      RSpec::Core::RakeTask.new(:three_ds_e2e) do |t|
        t.pattern = 'spec/three_d_secure/three_ds_automation_e2e_spec.rb'
        t.rspec_opts = '--format documentation'
      end
      Rake::Task[:three_ds_e2e].invoke
    end

    desc 'Run 3DS automation examples'
    task examples: :environment do
      RSpec::Core::RakeTask.new(:three_ds_examples) do |t|
        t.pattern = 'spec/three_d_secure/examples/**/*_spec.rb'
        t.rspec_opts = '--format documentation'
      end
      Rake::Task[:three_ds_examples].invoke
    end

    desc 'Run 3DS automation tests with coverage'
    task coverage: :environment do
      ENV['COVERAGE'] = 'true'
      Rake::Task['spec:three_ds:all'].invoke
    end
  end
end

# Default task
task default: 'three_ds:test'