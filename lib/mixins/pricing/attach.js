/**
 * dependencies
 */

var each = require('each');
var events = require('event');
var find = require('find');
var index = require('indexof');
var dom = require('../../util/dom');
var debug = require('debug')('recurly:pricing:attach');

/**
 * bind a dom element to pricing values
 *
 * TODO
 *   - move this into a plugin?
 *   - better name?
 *
 * @param {HTMLElement} el
 */

exports.attach = function (el) {
  var self = this;
  var elems = {};
  var el = dom.element(el);

  if (!el) throw new Error('invalid dom element');

  if (this.attach.detatch) this.attach.detatch();

  self.on('change', update);

  each(el.querySelectorAll('[data-recurly]'), function (elem) {
    // 'zip' -> 'postal_code'
    if (elem.dataset.recurly === 'zip') elem.dataset.recurly = 'postal_code';

    var name = elem.dataset.recurly;
    if (!elems[name]) elems[name] = [];
    elems[name].push(elem);
    events.bind(elem, 'change', change);
    events.bind(elem, 'propertychange', change);
  });

  this.attach.detatch = detatch;

  change();

  function change (event) {
    debug('change');

    var target = event && event.target && event.target.dataset.recurly;
    var all = !target;

    var pricing = self.plan(dom.value(elems.plan));
    
    if (all || target === 'currency') {
      pricing = pricing.currency(dom.value(elems.currency));
    }

    if ((all || target === 'addon') && elems.addon) {
      each(elems.addon, function (node) {
        var plan = self.items.plan;
        var addonCode = node.dataset.recurlyAddon;
        if (plan.addons && find(plan.addons, { code: addonCode })) {
          pricing = pricing.addon(addonCode, { quantity: node.value });
        }
      });
    }

    if ((all || target === 'coupon') && elems.coupon) {
      pricing = pricing.coupon(dom.value(elems.coupon));
    }

    if (all || ~index(['country', 'postal_code'], target)) {
      if (elems.country && elems.postal_code) {
        var address = {
          country: dom.value(elems.country),
          postal_code: dom.value(elems.postal_code)
        };

        pricing = pricing.address(address);
      }
    }

    pricing.done();
  };

  function update (price) {
    dom.value(elems.currencyCode, price.currency.code);
    dom.value(elems.currencySymbol, price.currency.symbol);
    each(['addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total'], function (value) {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });
    if (elems.addonPrice) {
      each(elems.addonPrice, function (elem) {
        var addonPrice = price.addons[elem.dataset.recurlyAddon];
        if (addonPrice) dom.value(elem, addonPrice);
      });
    }
  }

  function detatch () {
    each(elems, function (name, elems) {
      each(elems, function (elem) {
        events.unbind(elem, 'change', change);
        events.unbind(elem, 'propertychange', change);
      }, this);
    }, this);
  }
};

/**
 * Backward-compatibility
 *
 * @deprecated
 */

exports.binding = exports.attach;
