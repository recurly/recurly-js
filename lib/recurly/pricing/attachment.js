/**
 * dependencies
 */

var each = require('each');
var events = require('event');
var bind = require('bind');
var find = require('find');
var index = require('indexof');
var MutationObserver = require('mutation-observer');
var dom = require('../../util/dom');
var debug = require('debug')('recurly:pricing:attach');

/**
 * Binds a Pricing instance to a DOM subtree, modifying
 * the pricing instance upon observing changes to elements
 * marked with `data-recurly` attributes.
 *
 * Binds pricing change events to a DOM subtree update method.
 *
 * @param {Pricing} pricing
 * @param {HTMLElement} el element on which to attach
 * @throws {Error} If el not an HTMLElement
 * @constructor
 * @private
 */

function Attachment (pricing, el) {
  this.pricing = pricing;
  this.el = dom.element(el);

  if (!this.el) throw new Error('invalid dom element');

  this.change = bind(this, this.change);
  this.update = bind(this, this.update);
  this.rebind = bind(this, this.rebind);

  this.attach();
  this.change();
  this.observe();

  this.pricing.on('change', this.update);
};

/**
 * Binds an Attachment instance's change method
 * to marked elements in the DOM subtree.
 *
 * @private
 */

Attachment.prototype.attach = function () {
  this.elems = {};

  each(this.recurlyElements(), function (elem) {
    var name = dom.data(elem, 'recurly');

    deprecatedZipCorrection(elem, name);

    if (!this.elems[name]) this.elems[name] = [];
    this.elems[name].push(elem);

    events.bind(elem, 'change', this.change);
    events.bind(elem, 'propertychange', this.change);
  }, this);
};

/**
 * Handles change events from bound subtree elements.
 *
 * Detects which element has changed, and makes relevant
 * modifications to the bound pricing instance.
 *
 * @param {Event} event
 * @private
 */

Attachment.prototype.change = function (event) {
  debug('change');

  var self = this;
  var elems = this.elems;
  var pricing = this.pricing.plan(dom.value(elems.plan), { quantity: dom.value(elems.plan_quantity) });

  if (is('currency')) {
    pricing = pricing.currency(dom.value(elems.currency));
  }

  if (is('addon') && elems.addon) {
    each(elems.addon, function (node) {
      var plan = self.pricing.items.plan;
      var addonCode = dom.data(node, 'recurlyAddon');
      if (plan.addons && find(plan.addons, { code: addonCode })) {
        pricing = pricing.addon(addonCode, { quantity: dom.value(node) });
      }
    });
  }

  if (is('coupon') && elems.coupon) {
    pricing = pricing.coupon(dom.value(elems.coupon)).then(null, ignoreBadCoupons);
  }

  if (is('country') || is('postal_code') || is('vat_number')) {
    pricing = pricing.address({
      country: dom.value(elems.country),
      postal_code: dom.value(elems.postal_code),
      vat_number: dom.value(elems.vat_number)
    });
  }

  pricing.done();

  /**
   * Detects whether the event was fired by the given
   * element type
   *
   * @param {String} name element type: `data-recurly` value
   * @return {Boolean} whether the event was fired by the given element type
   * @private
   */

  function is (name) {
    if (!this.targetName) this.targetName = target(event);
    if (!this.targetName) return true;
    if (this.targetName === name) return true;
    return false;
  }
};

/**
 * Updates DOM subtree elements with pricing values.
 *
 * @param {Object} price Pricing.price object
 * @private
 */

Attachment.prototype.update = function (price) {
  var elems = this.elems;

  dom.value(elems.currency_code, price.currency.code);
  dom.value(elems.currency_symbol, price.currency.symbol);

  each(['addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total'], function (value) {
    dom.value(elems[value + '_now'], price.now[value]);
    dom.value(elems[value + '_next'], price.next[value]);
  }, this);

  if (elems.addon_price) {
    each(elems.addon_price, function (elem) {
      var addonPrice = price.base.addons[dom.data(elem, 'recurlyAddon')];
      if (addonPrice) dom.value(elem, addonPrice);
    });
  }
};

/**
 * Observes the DOM subtree, rebinding the Attachment
 * instance on structural changes
 *
 * @private
 */

Attachment.prototype.observe = function () {
  // WIP: Force usage of 'DOMSubtreeModified' events for testing.
  if (false && MutationObserver) {
    new MutationObserver(this.rebind).observe(this.el, { subtree: true, childList: true });
  } else {
    events.bind(this.el, 'DOMSubtreeModified', this.rebind);
  }
};

/**
 * Handles a DOM subtree modification event,
 * rebinding the Attachment isntance if the subtree
 * structure has changed.
 *
 * @param {Event} event
 * @private
 */

Attachment.prototype.rebind = function (event) {
  if (this.dirty(event)) {
    debug('rebinding');
    this.detach();
    this.attach();
  }
};

/**
 * Checks the DOM subtree for changes.
 *
 * Attempts first to use MutationObserver event payloads. If
 * this fails, performs a manual dirty check on the subtree.
 *
 * @param {Event} event
 * @return {Boolean} whether the subtree is dirty
 * @private
 */

Attachment.prototype.dirty = function (event) {
  var mutations = event instanceof Event ? [] : event;
  var dirty = false;

  if (mutations.length) {
    for (var i = 0; i < mutations.length; i++) {
      if (dom.data(mutations[i].target, 'recurly')) dirty = true;
    }
  } else {
    // Performs a dirty check by walking over current recurly elements and
    // checking against presence in the old set.
    var oldElems = [];
    each(this.elems, function (name, elems) {
      each(elems, function (elem) {
        oldElems.push(dom.data(elem, 'recurly'));
      });
    });
    each(this.recurlyElements(), function (elem) {
      var name = dom.data(elem, 'recurly');
      var i = index(oldElems, name);
      if (~i) oldElems.splice(i, 1);
      else dirty = true;
    });
    dirty = dirty || !!oldElems.length;
  }

  return dirty;
};

/**
 * Detaches this.elems from the change handler.
 *
 * @private
 */

Attachment.prototype.detach = function () {
  each(this.elems, function (name, elems) {
    each(elems, function (elem) {
      events.unbind(elem, 'change', this.change);
      events.unbind(elem, 'propertychange', this.change);
    }, this);
  }, this);
};

/**
 * Finds all elemends in the subtree marked
 * with `data-recurly` attributes.
 *
 * @return {NodeList} HTMLElements with `data-recurly` attributes
 */

Attachment.prototype.recurlyElements = function () {
  return this.el.querySelectorAll('[data-recurly]');
};

/**
 * Corrects 'zip' -> 'postal_code'
 *
 * @deprecated remove ~3.1.0; last used pre-3.0.0
 * @param {HTMLElement} elem
 * @param {String} name `data-recurly` value
 */

function deprecatedZipCorrection (elem, name) {
  if (name === 'zip') {
    name = 'postal_code';
    dom.data(elem, 'recurly', name);
  }
}

/**
 * Receives errors from a pricing.coupon call,
 * ignoring 'not-found' errors and throwing all others.
 *
 * @param {Error} err
 * @throws {Error} unless an error is 'not-found'
 */

function ignoreBadCoupons (err) {
  if (err.code === 'not-found') return;
  else throw err;
}

/**
 * Finds a target element from a given event
 * and gives its `data-recurly` value.
 *
 * @param {Event} event
 * @return {String} value of the target's `data-recurly` attribute
 */

function target (event) {
  if (!event) event = window.event;
  var target = event.target || event.srcElement;
  return dom.data(target, 'recurly')
}
