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
    this.orderTransactionMap = {};

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
      'client-id': data.client_id,
      'merchant-id': data.merchant_id,
      'vault': true,
      'data-user-id-token': data.id_token,
      'disable-funding': 'credit,card'
    }).then((paypal) => {
      paypal.Buttons({
        createOrder: () => this.createOrder(),
        onApprove: ({ orderID }) => this.onApprove(orderID),
      }).render('#paypal-paypal-commerce-button').catch((error) => {
        console.log('help!', error);
      });
    });
  }

  createOrder () {
    return this.recurly.request.post({
      route: '/paypal_commerce/create_order',
      data: this.options.pricing
    }).then(({ order_id, transaction_uuid }) => {
      this.orderTransactionMap[order_id] = transaction_uuid;

      return order_id;
    });
  }

  onApprove (orderID) {
    const transactionUuid = this.orderTransactionMap[orderID];
    alert(`Order ${orderID} APPROVED. Requestiong capture for transaction ${transactionUuid}...`);
    this.recurly.request.post({
      route: '/paypal_commerce/approve',
      data: { orderID, transactionUuid }
    });
  }
}

export default PayPalCommerce;
