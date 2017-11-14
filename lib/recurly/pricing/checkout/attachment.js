import Emitter from 'component-emitter';
import find from 'component-find';
import groupBy from 'lodash.groupby';
import MutationObserver from 'mutation-observer';
import SubscriptionPricing from '../subscription';
import dom from '../../../util/dom';

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

    // Collect subscription elements, grouped by their ids
    const subscriptionGroups = groupBy(elems.all, el => dom.data(el, 'recurlySubscription'));

    // Removes elements not paired to a subscription
    delete subscriptionGroups.undefined;

    // Builds a SubscriptionPricing instance per subscription element group
    // This probably needs to be collected by a Promise.all
    let subscriptions = Object.keys(subscriptionGroups).map(id => {
      const subscriptionElements = groupBy(subscriptionGroups[id], el => dom.data(el, 'recurly'));

      let subscription = new SubscriptionPricing(this.recurly)
        .plan(dom.value(subscriptionElements.plan))
        .done(price => {
          debugger;
        });

      // Addons (code, quantity)
      // Tax code
    });

    // - adjustments (amount, quantity)
    // - coupon
    // - gift card
    // - address
    // - tax info (vat number)

    // this.pricing = this.pricing.then().done(() => {
    //   if (event === INIT_RUN) this.emit('ready');
    // });
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
