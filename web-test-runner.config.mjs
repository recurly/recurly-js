import { playwrightLauncher } from '@web/test-runner-playwright';
import { createRequire } from 'module';
import {
  assertShimPlugin,
  promiseShimPlugin,
  esbuildBundlePlugin,
  jsonPlugin,
  addExtensionPlugin,
  sharedConfig,
} from './web-test-runner.shared.mjs';

const require = createRequire(import.meta.url);
require('@recurly/public-api-test-server');

const IS_REPORT_COVERAGE = process.env.REPORT_COVERAGE === 'true';

const PLAYWRIGHT_PRODUCTS = {
  Chrome: 'chromium',
  Firefox: 'firefox',
};

export default {
  ...sharedConfig,
  browsers: [
    playwrightLauncher({ product: PLAYWRIGHT_PRODUCTS[process.env.BROWSER] || 'chromium' }),
  ],
  plugins: [
    assertShimPlugin(),
    promiseShimPlugin(),
    esbuildBundlePlugin(),
    jsonPlugin(),
    addExtensionPlugin(),
  ],
  coverage: IS_REPORT_COVERAGE,
  coverageConfig: {
    ...sharedConfig.coverageConfig,
    report: IS_REPORT_COVERAGE,
  },
  browserStartTimeout: 60000,
  testsFinishTimeout: 600000,
};
