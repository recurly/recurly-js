/**
 * dependencies
 */

var each = require('each');
var events = require('event');
var find = require('find');
var index = require('indexof');
var dom = require('../../util/dom');
var debug = require('debug')('recurly:pricing:binding');

/**
 * bind a dom element to pricing values
 *
 * TODO
 *   - move this into a plugin?
 *   - better name?
 *
 * @param {HTMLElement} el
 */

exports.binding = function (el) {
  var self = this;
  var elems = {};
  var el = dom.element(el);

  if (!el) throw new Error('invalid dom element');

  if (this.binding.unbind) this.binding.unbind();

  self.on('change', update);

  each(el.querySelectorAll('[data-recurly]'), function (elem) {
    if (!elems[elem.dataset.recurly]) elems[elem.dataset.recurly] = [];
    elems[elem.dataset.recurly].push(elem);
    events.bind(elem, 'change', change);
    events.bind(elem, 'propertychange', change);
  });

  this.binding.unbind = unbind;

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
            country: dom.value(elems.country)
          , postal_code: dom.value(elems.postal_code)
        };

        pricing = pricing.address(address);
      }
    }

    pricing.done();
  };

  function update (price) {
    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);
    each(['subtotal', 'tax', 'total'], function (value) {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });
    if (elems.addon_price) {
      each(elems.addon_price, function (elem) {
        var addonPrice = price.addons[elem.dataset.recurlyAddon];
        if (addonPrice) dom.value(elem, addonPrice);
      });
    }
  }

  function unbind () {
    each(elems, function (name, elems) {
      each(elems, function (elem) {
        events.unbind(elem, 'change', change);
        events.unbind(elem, 'propertychange', change);
      }, this);
    }, this);
  }
};
