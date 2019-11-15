const Nightwatch = require('nightwatch');

try {
  Nightwatch.cli(argv => {
    argv._source = argv['_'].slice(0);

    const runner = Nightwatch.CliRunner(argv);
    const server = require('./server');

    runner.setup()
      .startWebDriver()
      .catch(err => { throw err; })
      .then(() => runner.runTests())
      .catch(err => runner.processListener.setExitCode(10))
      .then(() => runner.stopWebDriver())
      .catch(err => console.error(err))
      .then(() => process.exit(0));
  });
} catch (err) {
  console.error(err);
  process.exit(2);
}
