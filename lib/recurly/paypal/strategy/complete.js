import loadScriptPromise from '../../../util/load-script-promise';
import { PayPalStrategy } from './index';

const debug = require('debug')('recurly:paypal:strategy:complete');

const PATHS = {
  START: '/paypal_complete/start',
  ID_TOKEN: '/paypal_complete/id_token',
  SETUP_TOKEN: '/paypal_complete/setup_token',
  PAYMENT_TOKEN: '/paypal_complete/billing_token'
};

const DISABLE_FUNDING = [
  'card',
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
      .then(paypal => (
        paypal.Buttons({
          ...options.payPalComplete.buttonOptions,
          createVaultSetupToken: () => this.recurly.request.post({ route: PATHS.SETUP_TOKEN }).then(({ id }) => id),
          onApprove: ({ vaultSetupToken }) => {
            this.recurly.request.post({
              route: PATHS.PAYMENT_TOKEN,
              data: { approval_token_id: vaultSetupToken }
            }).then(token => this.emit('token', token))
          },
          onError: (error) => this.emit('error', error)
        }).render(options.payPalComplete.target)
      ))
      .catch(cause => this.error('paypal-complete-init-error', { cause }));
  }

  /**
   * Starts a popover integratration flow
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

    return this.recurly.request.post({ route: PATHS.ID_TOKEN })
      .then(({ client_id, id_token }) => loadScriptPromise(
        `https://www.paypal.com/sdk/js?client-id=${client_id}&disable-funding=${DISABLE_FUNDING.join(',')}`,
        { attrs: { id: 'test', 'data-user-id-token': id_token } }
      ))
      .then(() => window.paypal);
  }
}
