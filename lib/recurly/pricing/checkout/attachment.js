import Emitter from 'component-emitter';
import find from 'component-find';
import Promise from 'promise';
import uuid from 'uuid/v4';
import SubscriptionPricing from '../subscription';
import dom from '../../../util/dom';
import flatten from '../../../util/flatten';
import groupBy from '../../../util/group-by';
import {ignoreNotFound} from '../subscription/attachment';

const debug = require('debug')('recurly:pricing:checkout:attachment');

const INIT_RUN = 'init-all';

/**
 * Binds a DOM tree to CheckoutPricing values
 *
 * @param {CheckoutPricing} pricing
 * @param {HTMLElement} container Element on which to attach
 */

export default class Attachment extends Emitter {
  constructor (pricing, container) {
    super();
    this.pricing = pricing;
    this.recurly = pricing.recurly;
    this.container = dom.element(container);

    if (!this.container) throw new Error('invalid dom element');

    this.onInputChange = this.onInputChange.bind(this);
    this.updateOutput = this.updateOutput.bind(this);

    this.pricing.on('change', this.updateOutput);

    this.elements.all.forEach(elem => {
      elem.addEventListener('change', this.onInputChange);
      elem.addEventListener('propertychange', this.onInputChange);
    });

    this.onInputChange(INIT_RUN);
  }

  get elements () {
    if (this._elements) return this._elements;

    let elements = { all: [].slice.call(this.container.querySelectorAll('[data-recurly]')) };

    elements.all.forEach(node => {
      const name = dom.data(node, 'recurly');
      if (!(name in elements)) elements[name] = [];
      elements[name].push(node);
    });

    this._elements = elements;
    return elements;
  }

  /**
   * Handles input element changes
   */

  onInputChange (event) {
    debug('onInputChange');

    const elems = this.elements;

    // Collect subscription properties that are not given a subscription id,
    // and assign them one, assuming they are all meant to apply to one
    // subscription
    const orphanedSubscriptionId = uuid();
    flatten([elems.plan, elems.plan_quantity, elems.addon, elems.tax_code]).forEach(el => {
      if (!el) return;
      if (dom.data(el, 'recurlySubscription')) return;
      dom.data(el, 'recurlySubscription', orphanedSubscriptionId);
    });

    // Collect subscription elements, grouped by their ids,
    // then removes elements not paired to a subscription
    const subscriptionGroups = groupBy(elems.all, el => dom.data(el, 'recurlySubscription'));
    delete subscriptionGroups.undefined;

    // Remove abandoned subscriptions
    this.pricing.items.subscriptions.forEach(sub => {
      if (!subscriptionGroups[sub.id]) this.pricing.remove({ subscription: sub });
    });

    // Remove abandoned adjustments
    const adjustmentElemIds = (elems.adjustment || []).map(el => dom.data(el, 'recurlyAdjustment'));
    this.pricing.items.adjustments.forEach(adj => {
      if (!~adjustmentElemIds.indexOf(adj.id)) this.pricing.remove({ adjustment: adj });
    });

    // Builds a SubscriptionPricing instance per subscription element group
    Promise.all(Object.keys(subscriptionGroups).map(id => {
      const subscriptionElems = groupBy(subscriptionGroups[id], el => dom.data(el, 'recurly'));

      // Look for an existing subscription for this code
      let subscription = this.pricing.findSubscriptionById(id);

      if (!subscription) {
        subscription = new SubscriptionPricing(this.recurly, { id });
        this.pricing.subscription(subscription);
      }

      const quantity = dom.value(subscriptionElems.plan_quantity) || 1;

      return subscription
        // Plan
        .plan(dom.value(subscriptionElems.plan), { quantity })
        .then(() => {
          // Add-ons
          if (!subscriptionElems.addon) return;
          return Promise.all(subscriptionElems.addon.map(addonElem => {
            const code = dom.data(addonElem, 'recurlyAddon');
            const addonQuantity = dom.value(addonElem);

            return subscription
              .addon(code, { quantity: addonQuantity })
              .catch(e => this.pricing.error(e));
          }));
        })
        .then(() => {
          // Tax code
          if (!subscriptionElems.tax_code) return;
          return subscription.tax({ tax_code: dom.value(subscriptionElems.tax_code)});
        })
        .reprice();
    }))
    .then(() => {
      // Adjustments
      if (!elems.adjustment) return;
      return Promise.all(elems.adjustment.map(adjustmentElem => {
        const id = dom.data(adjustmentElem, 'recurlyAdjustment');
        const amount = dom.data(adjustmentElem, 'recurlyAdjustmentAmount');
        const quantity = dom.value(adjustmentElem);
        const currency = dom.data(adjustmentElem, 'recurlyAdjustmentCurrency');
        const taxCode = dom.data(adjustmentElem, 'recurlyAdjustmentTaxCode');
        const taxExempt = dom.data(adjustmentElem, 'recurlyAdjustmentTaxExempt')

        return this.pricing.adjustment({ id, amount, quantity, currency, taxCode, taxExempt });
      }));
    })
    .then(() => {
      // Currency
      if (!elems.currency) return;
      return this.pricing.currency(dom.value(elems.currency));
    })
    .then(() => {
      // Coupon
      if (!elems.coupon) return;
      return this.pricing
        .coupon(dom.value(elems.coupon).trim())
        .then(null, ignoreNotFound);
    })
    .then(() => {
      // Gift card
      if (!elems.gift_card) return;
      return this.pricing
        .giftCard(dom.value(elems.gift_card).trim())
        .then(null, ignoreNotFound);
    })
    .then(() => {
      // Address
      if (elems.country || elems.postal_code) {
        return this.pricing.address({
          country: dom.value(elems.country),
          postal_code: dom.value(elems.postal_code)
        });
      }
    })
    .then(() => {
      // Shipping Address
      if (elems['shipping_address.country'] || elems['shipping_address.postal_code']) {
        return this.pricing.shippingAddress({
          country: dom.value(elems['shipping_address.country']),
          postal_code: dom.value(elems['shipping_address.postal_code'])
        });
      }
    })
    .then(() => {
      if (!elems.vat_number) return;
      return this.pricing.tax({ vat_number: dom.value(elems.vat_number) });
    })
    .then(() => {
      return this.pricing.reprice();
    })
    .then(() => {
      if (event === INIT_RUN) this.emit('ready');
    })
    .done();
  }

  /**
   * Updates output elements
   *
   * - TODO: Should there be output elements for each item in `price[when].items`?
   *
   */
  updateOutput (price) {
    const elems = this.elements;

    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);

    ['subscriptions', 'adjustments', 'discount', 'subtotal', 'taxes', 'total'].forEach(value => {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });

    dom.value(elems['gift_card_now'], price.now.giftCard);
    dom.value(elems['gift_card_next'], price.next.giftCard);

    if (elems.addon_price) {
      elems.addon_price.forEach(elem => {
        const subscriptionId = dom.data(elem, 'recurlySubscription');
        const subscription = subscriptionId && this.pricing.findSubscriptionById(subscriptionId);
        if (!subscription) return;
        if (!subscription.isValid) return;
        const addonPrice = subscription.price.base.addons[dom.data(elem, 'recurlyAddon')];
        if (addonPrice) dom.value(elem, addonPrice);
      });
    }
  }

  detach () {
    this.pricing.off('change', this.updateOutput);

    this.elements.all.forEach(elem => {
      elem.removeEventListener('change', this.onInputChange);
      elem.removeEventListener('propertychange', this.onInputChange);
    });
  }
}
