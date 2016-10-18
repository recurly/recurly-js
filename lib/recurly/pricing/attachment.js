import events from 'component-event';
import find from 'component-find';
import dom from '../../util/dom';

const debug = require('debug')('recurly:pricing:attachment');

const INIT_RUN = 'init-all';

/**
 * bind a dom element to pricing values
 *
 * @param {Pricing} pricing
 * @param {HTMLElement} container Element on which to attach
 */

export default class Attachment {
  constructor (pricing, container) {
    this.pricing = pricing;
    this.container = dom.element(container);

    if (!this.container) throw new Error('invalid dom element');

    this.change = this.change.bind(this);
    this.update = this.update.bind(this);

    this.pricing.on('change', this.update);

    this.elements.all.forEach(elem => {
      events.bind(elem, 'change', this.change);
      events.bind(elem, 'propertychange', this.change);
    });

    this.change(INIT_RUN);
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

  change (event) {
    debug('change');

    const elems = this.elements;
    const target = event.target || event.srcElement;
    const targetName = dom.data(target, 'recurly');
    const updating = name => name in elems && event === INIT_RUN || targetName === name;
    const updateAddon = elems.addon && updating('addon');
    const updateAddress = updating('country') || updating('postal_code');
    const updateCurrency = updating('currency');
    const updateCoupon = elems.coupon && (updating('coupon') || updating('plan'));
    const updateGiftcard = elems.gift_card && updating('gift_card');
    const updateShippingAddress = updating('shipping_address.country') || updating('shipping_address.postal_code');
    const updateTax = updating('vat_number') || updating('tax_code');

    let pricing = this.pricing.plan(dom.value(elems.plan), { quantity: dom.value(elems.plan_quantity) });

    if (updateCurrency) {
      pricing = pricing.currency(dom.value(elems.currency));
    }

    if (updateAddon) {
      pricing = pricing.then(() => {
        elems.addon.forEach(elem => {
          const plan = this.pricing.items.plan;
          const code = dom.data(elem, 'recurlyAddon');
          const quantity = dom.value(elem);

          if (plan.addons && find(plan.addons, { code })) {
            pricing = pricing.addon(code, { quantity });
          }
        });
      });
    }

    if (updateCoupon) {
      pricing = pricing.coupon(dom.value(elems.coupon).trim()).then(null, ignoreNotFound);
    }

    if (updateGiftcard) {
      pricing = pricing.giftcard(dom.value(elems.gift_card).trim()).then(null, ignoreNotFound);
    }

    if (updateAddress) {
      pricing = pricing.address({
        country: dom.value(elems.country),
        postal_code: dom.value(elems.postal_code)
      });
    }

    if (updateShippingAddress) {
      pricing = pricing.shippingAddress({
        country: dom.value(elems['shipping_address.country']),
        postal_code: dom.value(elems['shipping_address.postal_code'])
      });
    }

    if (updateTax) {
      pricing = pricing.tax({
        vat_number: dom.value(elems.vat_number),
        tax_code: dom.value(elems.tax_code)
      });
    }

    this.pricing = pricing.done();
  }

  /**
   * Updates output elements
   */

  update (price) {
    const elems = this.elements;

    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);

    dom.value(elems.plan_base, price.base.plan.unit);
    dom.value(elems.plan_interval, price.base.plan.interval);

    ['plan', 'addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total', 'gift_card'].forEach(value => {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });

    if (elems.addon_price) {
      elems.addon_price.forEach(elem => {
        const addonPrice = price.base.addons[dom.data(elem, 'recurlyAddon')];
        if (addonPrice) dom.value(elem, addonPrice);
      });
    }
  }

  detach () {
    this.pricing.off('change', this.update);

    this.elements.all.forEach(elem => {
      events.unbind(elem, 'change', this.change);
      events.unbind(elem, 'propertychange', this.change);
    });
  }
}

function ignoreNotFound (err) {
  if (err.code === 'not-found') return;
  else throw err;
}
