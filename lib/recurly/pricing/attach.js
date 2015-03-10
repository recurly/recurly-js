/**
 * dependencies
 */

var each = require('each');
var events = require('event');
var find = require('find');
var type = require('type');
var dom = require('../../util/dom');
var debug = require('debug')('recurly:pricing:attach');

/**
 * bind a dom element to pricing values
 *
 * @param {HTMLElement} el
 */

exports.attach = function (el) {
  var self = this;
  var elems = {};
  var el = dom.element(el);

  if (!el) throw new Error('invalid dom element');

  if (this.detatch) this.detatch();

  this.on('change', update);

  each(el.querySelectorAll('[data-recurly]'), function (elem) {
    // 'zip' -> 'postal_code'
    if (dom.data(elem, 'recurly') === 'zip') dom.data(elem, 'recurly', 'postal_code');

    var name = dom.data(elem, 'recurly');
    if (!elems[name]) elems[name] = [];
    elems[name].push(elem);
    events.bind(elem, 'change', change);
    events.bind(elem, 'propertychange', change);
  });

  this.detatch = detatch;

  change();

  function change (event) {
    debug('change');

    var targetName = event && event.target && dom.data(event.target, 'recurly');
        targetName = targetName || window.event && window.event.srcElement;

    var pricing = self.plan(dom.value(elems.plan), { quantity: dom.value(elems.plan_quantity) });

    if (target('currency')) {
      pricing = pricing.currency(dom.value(elems.currency));
    }

    if (elems.addon && target('addon')) {
      addons();
    }

    if (elems.coupon && (target('coupon') || target('plan'))) {
      pricing = pricing.coupon(dom.value(elems.coupon)).then(null, ignoreBadCoupons);
    }

    if (target('country') || target('postal_code')) {
      pricing = pricing.address({
        country: dom.value(elems.country),
        postal_code: dom.value(elems.postal_code)
      });
    }

    if (target('vat_number') || target('tax_code')) {
      pricing = pricing.tax({
        vat_number: dom.value(elems.vat_number),
        tax_code: dom.value(elems.tax_code)
      });
    }

    pricing.done();

    function addons () {
      each(elems.addon, function (node) {
        var plan = self.items.plan;
        var addonCode = dom.data(node, 'recurlyAddon');
        if (plan.addons && find(plan.addons, { code: addonCode })) {
          pricing = pricing.addon(addonCode, { quantity: dom.value(node) });
        }
      });
    }

    function target (name) {
      if (!targetName) return true;
      if (targetName === name) return true;
      return false
    }
  };

  function update (price) {
    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);

    dom.value(elems.plan_base, price.base.plan.unit);
    dom.value(elems.plan_interval, price.base.plan.interval)

    each(['plan', 'addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total'], function (value) {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });

    if (elems.addon_price) {
      each(elems.addon_price, function (elem) {
        var addonPrice = price.base.addons[dom.data(elem, 'recurlyAddon')];
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

function ignoreBadCoupons (err) {
  if (err.code === 'not-found') return;
  else throw err;
}

/**
 * Backward-compatibility
 *
 * @deprecated
 */

exports.binding = exports.attach;
