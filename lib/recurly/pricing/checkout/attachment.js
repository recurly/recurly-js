import Emitter from 'component-emitter';
import find from 'component-find';
import groupBy from 'lodash.groupby';
import MutationObserver from 'mutation-observer';
import Promise from 'promise';
import SubscriptionPricing from '../subscription';
import dom from '../../../util/dom';
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

    // this.pricing.on('change', this.updateOutput);

    this.elements.all.forEach(elem => {
      elem.addEventListener('change', this.onInputChange);
      elem.addEventListener('propertychange', this.onInputChange);
    });

    this.onInputChange(INIT_RUN);

    this.observer = new MutationObserver(this.onMutation.bind(this));
    this.observer.observe(this.container, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-recurly']
    });
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

  onMutation (mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes;
        mutation.removedNodes;
      } else if (mutation.type === 'attributes') {
        mutation.attributeName === 'data-recurly';
        mutation.target;
        mutation.oldValue;
      }
    });
  }

  /**
   * Handles input element changes
   */

  onInputChange (event) {
    debug('onInputChange');

    const elems = this.elements;

    // FIXME: how to collect subscription elements if they do not
    //        have a subscription identifier? Should this be allowed
    //        for the single-susbscription case?

    // Collect subscription elements, grouped by their ids,
    // then removes elements not paired to a subscription
    const subscriptionGroups = groupBy(elems.all, el => dom.data(el, 'recurlySubscription'));
    delete subscriptionGroups.undefined;

    // Builds a SubscriptionPricing instance per subscription element group
    // This probably needs to be collected by a Promise.all
    Promise.all(Object.keys(subscriptionGroups).map(id => {
      const subscriptionElems = groupBy(subscriptionGroups[id], el => dom.data(el, 'recurly'));

      // Look for an existing subscription for this code
      let subscription = this.pricing.findSubscriptionById(id);

      if (!subscription) {
        subscription = new SubscriptionPricing(this.recurly, { id });
        this.pricing.subscription(subscription);
      }

      // FIXME: Update the subscription elements with the new id if they do not
      //        already have one. Should they be allowed to lack an identifier?

      // Plan
      subscription.plan(dom.value(subscriptionElems.plan));

      // Add-ons
      if (subscriptionElems.addon) {
        subscriptionElems.addon.forEach(addonElem => {
          const code = dom.data(addonElem, 'recurlyAddon');
          const quantity = dom.value(addonElem);

          // TODO: Does this allow pricing to continue?
          subscription = subscription.addon(code, { quantity }).catch(e => this.pricing.error(e));
        });
      }

      // Tax code
      // FIXME: This needs to be an attribute and not a separate element
      if (subscriptionElems.tax_code) {
        subscription = subscription.tax({ tax_code: dom.value(subscriptionElems.tax_code)});
      }

      return this.pricing.reprice().then(() => subscription.reprice());
    }))
    .then(() => {
      // Adjustments
      return Promise.all(elems.adjustment.map(adjustmentElem => {
        const code = dom.data(adjustmentElem, 'recurlyAdjustment');
        const amount = dom.data(adjustmentElem, 'recurlyAdjustmentAmount');
        const quantity = dom.value(adjustmentElem);
        const currency = dom.data(adjustmentElem, 'recurlyAdjustmentCurrency');
        const taxCode = dom.data(adjustmentElem, 'recurlyAdjustmentTaxCode');
        const taxExempt = dom.data(adjustmentElem, 'recurlyAdjustmentTaxExempt')

        // TODO: Determine if adjustment elements can lack codes. If they can,
        //       then the elements should be updated to include the generated
        //       adjustment code
        return this.pricing.adjustment({ code, amount, quantity, currency, taxCode, taxExempt });
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
      // TODO: Shipping address...
    })
    .then(() => {
      if (!elems.vat_number) return;
      return this.pricing.tax({ vat_number: dom.value(elems.vat_number) });
    })
    .then(() => {
      if (event === INIT_RUN) this.emit('ready');
      return this.pricing.reprice();
    })
    .done();
  }

  /**
   * Updates output elements
   */

  updateOutput (price) {
  }

  detach () {
    this.pricing.off('change', this.updateOutput);

    this.elements.all.forEach(elem => {
      elem.removeEventListener('change', this.onInputChange);
      elem.removeEventListener('propertychange', this.onInputChange);
    });

    this.observer.disconnect();
  }
}
