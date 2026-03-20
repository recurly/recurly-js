import dateFromNow from '../../../util/date-from-now';
import loadScriptPromise from '../../../util/load-script-promise';
import CheckoutPricing from '../../pricing/checkout';
import { PayPalStrategy } from './index';

const debug = require('debug')('recurly:paypal:strategy:complete');

const PATHS = {
  START: '/paypal_complete/start',
  ID_TOKENS: '/paypal_complete/id_tokens',
  SETUP_TOKENS: '/paypal_complete/setup_tokens',
  BILLING_TOKENS: '/paypal_complete/billing_tokens'
};

const PERIOD_INTERVAL_TO_BILLING_FREQUENCY = {
  days: 'DAY',
  weeks: 'WEEK',
  months: 'MONTH',
  years: 'YEAR'
};

const USAGE_PATTERN_PREPAID = 'SUBSCRIPTION_PREPAID';
const USAGE_PATTERN_POSTPAID = 'RECURRING_POSTPAID';

const PRICING_MODEL_FIXED = 'FIXED';
const PRICING_MODEL_VARIABLE = 'VARIABLE';

const DISABLE_FUNDING = [
  // 'card',
  // 'credit',
  'paylater',
  'bancontact',
  'blik',
  'eps',
  'giropay',
  'ideal',
  'mercadopago',
  'mybank',
  'p24',
  'sepa',
  'sofort',
  // 'venmo'
];

/**
 * PayPal Complete strategy
 */
export class CompleteStrategy extends PayPalStrategy {
  constructor (...args) {
    super(...args);
    this.emit('ready');
  }

  loadScriptPromise = loadScriptPromise;

  /**
   * configure
   *
   * @param {Object}          options
   * @param {String}          [gatewayCode]
   * @param {Object|Boolean}  [payPalComplete]               `true` for deprecated integration
   * @param {Object}          [payPalComplete.buttonOptions] PayPal button options. See
   *                                                         https://developer.paypal.com/sdk/js/reference/#buttons
   * @param {Object}          [payPalComplete.target]        rendering target for PayPal buttons
   * @param {CheckoutPricing} [payPalComplete.pricing]       A CheckoutPricing instance from which to derive usage
   *                                                         pattern and billing plan details
   * @param {String}          [payPalComplete.usagePattern]  Ignored if `payPalComplete.pricing` is set
   * @param {Object}          [payPalComplete.billingPlan]   Ignored if `payPalComplete.pricing` is set
   */
  configure (options) {
    super.configure(options);

    if (options.payPalComplete === true) return;

    if (!options.payPalComplete.target) {
      throw this.error('paypal-config-missing', { opt: 'payPalComplete.target' });
    }

    if (options.gatewayCode) this.config.gatewayCode = options.gatewayCode;

    let setupTokenOptions = {};
    if (options.payPalComplete.pricing instanceof CheckoutPricing) {
      const updateFromPricing = () => setupTokenOptions = setupTokenOptionsFromPricing(options.payPalComplete.pricing);
      options.payPalComplete.pricing.on('change', updateFromPricing);
      updateFromPricing();
    } else {
      if (options.payPalComplete.usagePattern) setupTokenOptions.usage_pattern = options.payPalComplete.usagePattern;
      if (options.payPalComplete.billingPlan) setupTokenOptions.billing_plan = options.payPalComplete.billingPlan;
    }

    this.withSdk()
      .then(paypal => {
        debug('initializing PayPal.Buttons', options.payPalComplete.buttonOptions);
        paypal.Buttons({
          ...options.payPalComplete.buttonOptions,
          createVaultSetupToken: () => {
            const data = { ...setupTokenOptions };
            if (this.config.gatewayCode) data.gateway_code = this.config.gatewayCode;

            return this.recurly.request.post({
              route: PATHS.SETUP_TOKENS,
              data
            }).then(({ paypal_setup_token_id }) => paypal_setup_token_id);
          },
          onApprove: ({ vaultSetupToken }) => {
            const data = { approval_token_id: vaultSetupToken };
            if (this.config.gatewayCode) data.gateway_code = this.config.gatewayCode;

            this.recurly.request.post({
              route: PATHS.BILLING_TOKENS,
              data
            }).then(token => this.emit('token', token));
          },
          onError: (error) => this.emit('error', error)
        }).render(options.payPalComplete.target);
      })
      .catch(cause => this.error('paypal-complete-init-error', { cause }));
  }

  /**
   * Starts a popover integration flow
   *
   * @deprecated
   */
  start () {
    const payload = {};
    if (this.config.gatewayCode) payload.gateway_code = this.config.gatewayCode;

    const frame = this.frame = this.recurly.Frame({ path: PATHS.START, payload });

    frame.once('done', token => this.emit('token', token));
    frame.once('close', () => this.emit('cancel'));
    frame.once('error', cause => {
      if (cause.code === 'paypal-cancel') this.emit('cancel');
      this.error('paypal-tokenize-error', { cause });
    });
  }

  destroy () {
    if (this.frame) this.frame.destroy();
    this.off();
  }

  withSdk () {
    if (window.paypal) return Promise.resolve(window.paypal);

    const url = (clientId, merchantId) => `
      https://www.paypal.com/sdk/js
        ?client-id=${clientId}
        ${merchantId ? `&merchant-id=${merchantId}` : ''}
        &disable-funding=${DISABLE_FUNDING.join(',')}
    `.replace(/\s|\n/g, '');

    const opts = (idToken, partnerAttributionId) => ({
      attrs: Object.fromEntries(Object.entries({
        'data-partner-attribution-id': partnerAttributionId,
        'data-user-id-token': idToken
      }).filter(([_, v]) => v))
    });

    return this.recurly.request.post({ route: PATHS.ID_TOKENS })
      .then(({ client_id, id_token, merchant_id, partner_attribution_id }) => this.loadScriptPromise(
        url(client_id, merchant_id),
        opts(id_token, partner_attribution_id)
      ))
      .then(() => window.paypal);
  }
}

/**
 * Derives setup token options from a CheckoutPricing instance.
 *
 * usage_pattern:
 *   - any usage-based add-ons selected → RECURRING_POSTPAID
 *   - no usage-based add-ons selected  → RECURRING_PREPAID
 *
 * billing_plan is always derived from the first valid subscription's plan,
 * including billing_cycles with frequency and pricing_scheme, and
 * one_time_charges when a setup fee is present.
 *
 * @param {CheckoutPricing} checkoutPricing
 * @return {{ usage_pattern: string, billing_plan: Object }}
 */
function setupTokenOptionsFromPricing (checkoutPricing) {
  if (!(checkoutPricing instanceof CheckoutPricing)) return {};

  const validSubscriptions = checkoutPricing.validSubscriptions;
  if (!validSubscriptions.length) return {};

  const subscription = validSubscriptions[0];
  const plan = subscription.items.plan;
  const currency_code = checkoutPricing.currencyCode;

  const one_time_charges = {
    total_amount: { value: subscription.price.now.total, currency_code }
  };

  if (subscription.price.now.setup_fee > 0) {
    one_time_charges.setup_fee = { value: subscription.price.now.setup_fee, currency_code };
  }

  if (subscription.price.now.tax > 0) {
    one_time_charges.taxes = { value: subscription.price.now.tax, currency_code };
  }

  const billingPlan = {
    name: plan.name,
    billing_cycles: [],
    one_time_charges
  };

  let futureStartDate;
  if (plan.trial) {
    billingPlan.billing_cycles.push({
      tenure_type: 'TRIAL',
      sequence: 1,
      total_cycles: 1,
      frequency: {
        interval_unit: PERIOD_INTERVAL_TO_BILLING_FREQUENCY[plan.trial.interval],
        interval_count: plan.trial.length
      }
    });

    futureStartDate = dateFromNow(plan.trial.length, plan.trial.interval).toISOString().substr(0, 10);
  }

  billingPlan.billing_cycles.push({
    tenure_type: 'REGULAR',
    sequence: billingPlan.billing_cycles.length + 1,
    ...(futureStartDate ? { start_date: futureStartDate } : null),
    total_cycles: 0,
    frequency: {
      interval_unit: PERIOD_INTERVAL_TO_BILLING_FREQUENCY[plan.period.interval],
      interval_count: plan.period.length
    },
    pricing_scheme: {
      pricing_model: (subscription.hasAnyUsageAddons || subscription.hasRampIntervals)
        ? PRICING_MODEL_VARIABLE
        : PRICING_MODEL_FIXED,
      price: {
        value: subscription.price.next.total,
        currency_code
      }
    }
  });

  return {
    usage_pattern: subscription.hasAnyUsageAddons ? USAGE_PATTERN_POSTPAID : USAGE_PATTERN_PREPAID,
    billing_plan: billingPlan
  };
}
