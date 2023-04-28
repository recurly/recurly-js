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
      this.loadPayPalCommerceScript(res);
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
      'merchant-id': data.merchant_id,
      'vault': true,
      'data-user-id-token': data.id_token
    }).then((paypal) => {
      paypal.Buttons({
        createOrder: () => {
          return this.createOrder().then((res) => {
            console.log('createOrder', res);
            return res.order_id;
          });
        },
        onApprove: () => {
          return this.onApprove();
        },
      }).render('#paypal-paypal-commerce-button').catch((error) => {
        console.log('help!', error);
      });
    });
  }

  createOrder () {
    console.log('OPTIONS', this.options);
    return this.recurly.request.post({
      route: '/paypal_commerce/create_order',
      data: this.options.pricing
    });
  }

  onApprove () {
    console.log('onApprove NOT IMPLEMENTED');
  }
}

export default PayPalCommerce;
