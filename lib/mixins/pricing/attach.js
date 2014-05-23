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
    if (dom.data(elem, 'recurly') === 'zip') dom.data(elem, 'recurly', 'postal_code');

    var name = dom.data(elem, 'recurly');
    if (!elems[name]) elems[name] = [];
    elems[name].push(elem);
    events.bind(elem, 'change', change);
    events.bind(elem, 'propertychange', change);
  });

  this.attach.detatch = detatch;

  change();

  function change (event) {
    debug('change');

    var target = event && event.target && dom.data(event.target, 'recurly')
              || window.event && window.event.srcElement;

    var all = !target;

    var pricing = self.plan(dom.value(elems.plan), { quantity: dom.value(elems.plan_quantity) });
    
    if (all || target === 'currency') {
      pricing = pricing.currency(dom.value(elems.currency));
    }

    if ((all || target === 'addon') && elems.addon) {
      each(elems.addon, function (node) {
        var plan = self.items.plan;
        var addonCode = dom.data(node, 'recurlyAddon');
        if (plan.addons && find(plan.addons, { code: addonCode })) {
          pricing = pricing.addon(addonCode, { quantity: node.value });
        }
      });
    }

    if ((all || target === 'coupon') && elems.coupon) {
      pricing = pricing.coupon(dom.value(elems.coupon));
    }

    if (all || ~index(['country', 'postal_code', 'vat_number'], target)) {
      pricing = pricing.address({
        country: dom.value(elems.country),
        postal_code: dom.value(elems.postal_code),
        vat_number: dom.value(elems.vat_number)
      });
    }

    pricing.done();
  };

  function update (price) {
    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);
    each(['addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total'], function (value) {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });
    if (elems.addonPrice) {
      each(elems.addonPrice, function (elem) {
        var addonPrice = price.addons[dom.data(elem, 'recurlyAddon')];
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
