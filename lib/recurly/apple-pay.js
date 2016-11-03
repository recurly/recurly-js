import Promise from 'promise';
import Emitter from 'component-emitter';
import errors from '../errors';

const debug = require('debug')('recurly:apple-pay');

const REQUIRED = [
  'country',
  'currency',
  'label',
  'total'
];

export function factory (options) {
  return new ApplePay(Object.assign({}, options, { recurly: this }));
};

class ApplePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {};
    this.once('ready', () => this._ready = true);

    if (!global.ApplePaySession) return this.fatal = this.error('apple-pay-not-supported');
    if (!ApplePaySession.canMakePayments()) return this.fatal = this.error('apple-pay-not-available');

    this.configure(options);
    if (!this.fatal) this.emit('ready');
  }

  get session () {
    if (this._session) return this._session;

    debug('Creating new Apple Pay session');

    let session = new ApplePaySession(1, {
      countryCode: this.config.country,
      currencyCode: this.config.currency,
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS'],
      total: { label: this.config.label, amount: this.config.total }
    });

    session.onvalidatemerchant = this.onValidate.bind(this);
    session.onpaymentauthorized = e => console.info('onpaymentauthorized', e);
    session.onpaymentmethodselected = e => console.info('onpaymentmethodselected', e);
    session.onshippingcontactselected = e => console.info('onshippingcontactselected', e);
    session.onshippingmethodselected = e => console.info('onshippingmethodselected', e);
    session.oncancel = this.onCancel.bind(this);

    return this._session = session;
  }

  ready (cb) {
    if (this._ready) cb();
    else this.once('ready', cb);
  }

  configure (options) {
    REQUIRED.forEach(req => {
      if (req in options) this.config[req] = options[req];
      else return this.fatal = this.error('apple-pay-config-missing', { param: req });
    });

    if ('recurly' in options) this.recurly = options.recurly;
    else this.fatal = this.error('apple-pay-factory-only');

    // get merchant info from /apple_pay/info, error if anything required is missing
  }

  begin (done) {
    if (this.fatal) return this.error('apple-pay-fatal-error', { fatal: this.fatal });
    delete this._session;
    this.session.begin();
  }

  /**
   * Validates the merchant session
   *
   * @param  {Event} event ApplePayValidateMerchantEvent
   * @return {[type]}       [description]
   */
  onValidate (event) {
    debug('Validating Apple Pay merchant session', event);

    const validationURL = event.validationURL;
    const done = (err, session) => {
      if (err) this.error(err);
      else this.session.completeMerchantValidation(session);
    };

    this.recurly.request('post', '/apple_pay/start', { validationURL }, done);
  }

  onCancel (event) {
    debug('User canceled Apple Pay payment', event);

    // TODO: mark the session as dead?
  }

  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}
