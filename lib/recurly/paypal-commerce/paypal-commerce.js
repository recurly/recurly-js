import Emitter from 'component-emitter';
import { loadScript } from '@paypal/paypal-js';
/**
* @param {Object} options
* @constructor
* @public
*/
export class PayPalCommerce extends Emitter {
  constructor (recurly, options) {
    super();
    this.recurly = recurly;
    this.options = options;
    this.form = options.form;

    this.accessToken().then((res) => {
      this.loadPayPalCommerceScript(res.data);
    });
  }

  accessToken () {
    return this.recurly.request.post({
      route: '/paypal_commerce/access_tokens'
    });
  }

  loadPayPalCommerceScript (data) {
    console.log('loadPayPalCommerceScript', data);
    loadScript({
      'data-namespace': 'name-space',
      'client-id': this.options.client_id,
      'merchant-id': this.options.merchant_id,
      'vault': true,
      'data-user-id-token': data.id_token
    }).then((paypal) => {
      paypal.Buttons({
        createOrder: () => {
          return this.createOrder();
        },
        onApprove: () => {
          return this.onApprove();
        }
      }).render('#paypal-paypal-commerce-button').catch((error) => {
        console.log('help!', error);
      });
    });
  }

  createOrder () {
    console.log('createOrder NOT IMPLEMENTED');
  }

  onApprove () {
    console.log('onApprove NOT IMPLEMENTED');
  }
}

export default PayPalCommerce;