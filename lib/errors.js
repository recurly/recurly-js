/**
 * dependencies
 */

var mixin = require('mixin');

/**
 * Export `errors`.
 */

module.exports = errors;

/**
 * Error accessor.
 *
 * @param {String} name
 * @param {Object} options
 * @return {Error}
 */

function errors (name, options) {
  return errors.get(name, options);
}

/**
 * Defined errors.
 *
 * @type {Object}
 * @private
 */

errors.map = {};

/**
 * Base url for documention.
 *
 * @type {String}
 * @private
 */

errors.baseURL = '';

/**
 * Sets the `baseURL` for docs.
 *
 * @param {String} url
 * @public
 */

errors.doc = function (baseURL) {
  errors.baseURL = baseURL;
};

/**
 * Gets errors defined by `name`.
 *
 * @param {String} name
 * @param {Object} context
 * @return {Error}
 * @public
 */

errors.get = function (name, context) {
  if (!(name in errors.map)) {
    throw new Error('invalid error');
  } else {
    return new errors.map[name](context);
  }
};

/**
 * Registers an error defined by `name` with `config`.
 *
 * @param {String} name
 * @param {Object} config
 * @return {Error}
 * @public
 */

errors.add = function (name, config) {
  config = config || {};

  function RecurlyError (context) {
    Error.call(this);

    this.name = this.code = name;
    if (config.message instanceof Function) {
      this.message = config.message(context);
    } else {
      this.message = config.message;
    }
    mixin(this, context || {});

    if (config.help) {
      this.help = errors.baseURL + config.help;
      this.message += ' (need help? ' + this.help + ')';
    }
  };

  RecurlyError.prototype = new Error();
  return errors.map[name] = RecurlyError;
};

/**
 * Internal definations.
 *
 * TODO(gjohnson): open source this as a component
 * and move these out.
 */

errors.doc('https://docs.recurly.com/js');

errors.add('already-configured', {
  message: 'Configuration may only be set once.',
  help: '#identify-your-site'
});

errors.add('not-configured', {
  message: 'Not configured. You must first call recurly.configure().',
  help: '#identify-your-site'
});

errors.add('config-missing-public-key', {
  message: 'The publicKey setting is required.',
  help: '#identify-your-site'
});

errors.add('config-missing-fields', {
  message: 'The fields setting is required.',
  // TODO: Link to docs
  // help: '#identify-your-site'
});

errors.add('missing-hosted-field-target', {
  message: c => `Target element not found for ${c.type} field using selector '${c.selector}'`
});

errors.add('api-error', {
  message: 'There was an error with your request.'
});

errors.add('api-timeout', {
  message: 'The API request timed out.'
});

errors.add('validation', {
  message: 'There was an error validating your request.'
});

errors.add('missing-callback', {
  message: 'Missing callback'
});

errors.add('invalid-options', {
  message: 'Options must be an object'
});

errors.add('missing-plan', {
  message: 'A plan must be specified.'
});

errors.add('missing-coupon', {
  message: 'A coupon must be specified.'
});

errors.add('invalid-item', {
  message: 'The given item does not appear to be a valid recurly plan, coupon, addon, or taxable address.'
});

errors.add('invalid-addon', {
  message: 'The given addon_code is not among the valid addons for the specified plan.'
});

errors.add('invalid-currency', {
  message: 'The given currency is not among the valid codes for the specified plan.'
});

errors.add('unremovable-item', {
  message: 'The given item cannot be removed.'
});

errors.add('fraud-data-collector-request-failed', {
  message: c => `There was an error getting the data collector fields: ${c.error}`
});

errors.add('fraud-data-collector-missing-form', {
  message: c => `There was an error finding a form to inject the data collector fields using selector '${c.selector}'`
});

errors.add('gift-card-currency-mismatch', {
  message: 'The giftcard currency does not match the given currency.'
});

errors.add('apple-pay-not-supported', {
  message: 'Apple Pay is not supported by this device or browser.'
});

errors.add('apple-pay-not-available', {
  message: 'Apple Pay is supported by this device, but the customer has not configured Apple Pay.'
});

errors.add('apple-pay-config-missing', {
  message: c => `Missing Apple Pay configuration option: '${c.opt}'`
});

errors.add('apple-pay-config-invalid', {
  message: c => `Apple Pay configuration option '${c.opt}' is not among your available options: ${c.set}.
                 Please refer to your site configuration if the available options is incorrect.`
});

errors.add('apple-pay-factory-only', {
  message: 'Apple Pay must be initialized by calling recurly.applePay'
});

errors.add('apple-pay-fatal-error', {
  message: c => {
    let message = 'Apple Pay did not initialize due to a fatal error';
    if (c.err) message += `: ${c.err.message}`;
    return message;
  }
});
