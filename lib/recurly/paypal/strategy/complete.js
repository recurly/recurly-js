import loadScriptPromise from '../../../util/load-script-promise';
import { PayPalStrategy } from './index';

const debug = require('debug')('recurly:paypal:strategy:complete');

const PATHS = {
  START: '/paypal_complete/start',
  ID_TOKENS: '/paypal_complete/id_tokens',
  SETUP_TOKENS: '/paypal_complete/setup_tokens',
  BILLING_TOKENS: '/paypal_complete/billing_tokens'
};

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
   * @param {Object|Boolean}  payPalComplete                 `true` for deprecated integration
   * @param {Object}          [payPalComplete.buttonOptions] PayPal button options. See https://developer.paypal.com/sdk/js/reference/#buttons
   * @param {Object}          [payPalComplete.target]        rendering target for PayPal buttons
   */
  configure (options) {
    super.configure(options);

    if (options.payPalComplete === true) return;

    if (!options.payPalComplete.target) {
      throw this.error('paypal-config-missing', { opt: 'payPalComplete.target' });
    }

    this.withSdk()
      .then(paypal => {
        debug('initializing PayPal.Buttons', options.payPalComplete.buttonOptions);
        paypal.Buttons({
          ...options.payPalComplete.buttonOptions,
          createVaultSetupToken: () => (
            this.recurly.request.post({
              route: PATHS.SETUP_TOKENS
            }).then(({ paypal_setup_token_id }) => paypal_setup_token_id)
          ),
          onApprove: ({ vaultSetupToken }) => {
            this.recurly.request.post({
              route: PATHS.BILLING_TOKENS,
              data: { approval_token_id: vaultSetupToken }
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
