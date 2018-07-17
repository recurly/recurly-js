import {Reporter} from './reporter';

const BASE_URL = 'https://dev.recurly.com/docs/recurly-js-';
const ERRORS = [
  {
    code: 'not-configured',
    message: 'Not configured. You must first call recurly.configure().',
    classification: 'merchant',
    help: 'getting-started#section-configure'
  },
  {
    code: 'config-missing-public-key',
    message: 'The publicKey setting is required.',
    classification: 'merchant',
    help: '#identify-your-site'
  },
  {
    code: 'config-missing-fields',
    message: 'The fields setting is required.',
    classification: 'merchant'
  },
  {
    code: 'missing-hosted-field-target',
    message: c => `Target element not found for ${c.type} field using selector '${c.selector}'`,
    classification: 'merchant'
  },
  {
    code: 'api-error',
    message: 'There was an error with your request.',
    classification: 'api'
  },
  {
    code: 'api-timeout',
    message: 'The API request timed out.',
    classification: 'api'
  },
  {
    code: 'validation',
    message: 'There was an error validating your request.',
    classification: 'customer'
  },
  {
    code: 'missing-callback',
    message: 'Missing callback',
    classification: 'merchant'
  },
  {
    code: 'invalid-options',
    message: 'Options must be an object',
    classification: 'merchant'
  },
  {
    code: 'invalid-option',
    message: c => `Option ${c.name} must be ${c.expect}`,
    classification: 'merchant'
  },
  {
    code: 'missing-plan',
    message: 'A plan must be specified.',
    classification: 'merchant'
  },
  {
    code: 'missing-coupon',
    message: 'A coupon must be specified.',
    classification: 'merchant'
  },
  {
    code: 'invalid-item',
    message: 'The given item does not appear to be a valid recurly plan, coupon, addon, or taxable address.',
    classification: 'merchant'
  },
  {
    code: 'invalid-addon',
    message: 'The given addon_code is not among the valid addons for the specified plan.',
    classification: 'merchant'
  },
  {
    code: 'invalid-currency',
    message: c => `The given currency (${c.currency}) is not among the valid codes for the specified plan(s): ${c.allowed}.`,
    classification: 'merchant'
  },
  {
    code: 'invalid-plan-currency',
    message: c => `The requested plan (${c.planCode}) does not support the possible checkout currencies: ${c.currencies}.`,
    classification: 'merchant'
  },
  {
    code: 'invalid-subscription-currency',
    message: 'The given subscription does not support the currencies of this Checkout instance\'s existing subscriptions',
    classification: 'merchant'
  },
  {
    code: 'unremovable-item',
    message: 'The given item cannot be removed.',
    classification: 'merchant'
  },
  {
    code: 'fraud-data-collector-request-failed',
    message: c => `There was an error getting the data collector fields: ${c.error}`,
    classification: 'internal'
  },
  {
    code: 'fraud-data-collector-missing-form',
    message: c => `There was an error finding a form to inject the data collector fields using selector '${c.selector}'`,
    classification: 'merchant'
  },
  {
    code: 'gift-card-currency-mismatch',
    message: 'The giftcard currency does not match the given currency.',
    classification: 'merchant'
  },
  {
    code: 'apple-pay-not-supported',
    message: 'Apple Pay is not supported by this device or browser.',
    classification: 'environment'
  },
  {
    code: 'apple-pay-not-available',
    message: 'Apple Pay is supported by this device, but the customer has not configured Apple Pay.',
    classification: 'environment'
  },
  {
    code: 'apple-pay-config-missing',
    message: c => `Missing Apple Pay configuration option: '${c.opt}'`,
    classification: 'merchant'
  },
  {
    code: 'apple-pay-config-invalid',
    message: c => `Apple Pay configuration option '${c.opt}' is not among your available options: ${c.set}.
                   Please refer to your site configuration if the available options is incorrect.`,
    classification: 'merchant'
  },
  {
    code: 'apple-pay-factory-only',
    message: 'Apple Pay must be initialized by calling recurly.ApplePay',
    classification: 'merchant'
  },
  {
    code: 'apple-pay-init-error',
    message: c => {
      let message = 'Apple Pay did not initialize due to a fatal error';
      if (c.err) message += `: ${c.err.message}`;
      return message;
    },
    classification: 'internal'
  },
  {
    code: 'apple-pay-payment-failure',
    message: 'Apply Pay could not charge the customer',
    classification: 'internal'
  },
  {
    code: 'paypal-factory-only',
    message: 'PayPal must be initialized by calling recurly.PayPal',
    classification: 'merchant'
  },
  {
    code: 'paypal-config-missing',
    message: c => `Missing PayPal configuration option: '${c.opt}'`,
    classification: 'merchant'
  },
  {
    code: 'paypal-load-error',
    message: 'Client libraries failed to load',
    classification: 'environment'
  },
  {
    code: 'paypal-client-error',
    message: 'PayPal encountered an unexpected error',
    classification: 'internal'
  },
  {
    code: 'paypal-tokenize-error',
    message: 'An error occurred while attempting to generate the PayPal token',
    classification: 'internal'
  },
  {
    code: 'paypal-tokenize-recurly-error',
    message: 'An error occurred while attempting to generate the Recurly token',
    classification: 'internal'
  },
  {
    code: 'paypal-braintree-not-ready',
    message: 'Braintree PayPal is not yet ready to create a checkout flow',
    classification: 'merchant'
  },
  {
    code: 'paypal-braintree-api-error',
    message: 'Braintree API experienced an error',
    classification: 'internal'
  },
  {
    code: 'paypal-braintree-tokenize-braintree-error',
    message: 'An error occurred while attempting to generate the Braintree token',
    classification: 'internal'
  },
  {
    code: 'paypal-braintree-tokenize-recurly-error',
    message: 'An error occurred while attempting to generate the Braintree token within Recurly',
    classification: 'internal'
  }
];

/**
 * Error directory
 *
 * @param {Recurly} recurly instance
 */
class ErrorDirectory {
  constructor () {
    this.ERROR_MAP = ERRORS.reduce((memo, definition) => {
      memo[definition.code] = recurlyErrorFactory(definition);
      return memo;
    }, {});
  }

  /**
   * Retrieves an error from the directory
   *
   * @param {String} code
   * @param {Object} [context] arbitrary error property dictionary
   * @param {Object} [options]
   * @param {Reporter} [options.reporter] Reporter instance to report errors
   * @return {RecurlyError}
   * @throws {Error} if the requested error is not in the directory
   */
  get (code, context = {}, options) {
    if (!(code in this.ERROR_MAP)) {
      throw new Error(`invalid error: ${code}`);
    } else {
      return new this.ERROR_MAP[code](context, options);
    }
  }
}

/**
 * Generates a function which binds error properties to a RecurlyError
 *
 * @param {Object} definition
 * @return {Function}
 */
function recurlyErrorFactory (definition) {
  const { code, message, help } = definition;

  /**
   * Recurly domain-specific error class
   *
   * Provides helpful context to runtime errors. Logs errors.
   *
   * @param {String} code error code
   * @param {String} message error message
   * @param {Object} context suplementary error data
   * @param {Object} [options]
   * @param {Reporter} [options.reporter] Reporter instance used to report an error
   * @param {String} [help] documentation reference
   */
  function RecurlyError (context = {}, options = {}) {
    this.code = this.name = code;

    if (message instanceof Function) {
      this.message = message(context);
    } else {
      this.message = message;
    }

    Object.assign(this, context);

    if (options.reporter) this.reporter = options.reporter;

    if (help) {
      this.help = BASE_URL + help;
      this.message += ` (need help? ${this.help})`;
    }

    if (this.reporter instanceof Reporter) {
      let type = 'client';
      if (this.classification) type += `:${this.classification}`;

      // Warning: any errors that occur in this code path risk
      // a stack overflow if they include a reporter
      this.reporter.send('error', { type });
    }
  }

  RecurlyError.prototype = new Error();
  return RecurlyError;
}

const errorDirectory = new ErrorDirectory();

/**
 * Exported singleton proxy
 *
 * See ErrorDirectory.get
 */
export default function error (...params) {
  return errorDirectory.get(...params);
};
