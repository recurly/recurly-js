
/*!
 * Module dependencies.
 */

var index = require('indexof');
var each = require('each');
var dom = require('./dom');
var parseCard = require('../util/parse-card');

/**
 * Parses options out of a form element and normalizes according to a whitelist.
 *
 * @param {Array} whitelist of field names
 * @param {Object|HTMLFormElement} input
 * @return {Object}
 */

module.exports = function normalize (whitelist, input, options) {
  var el = dom.element(input);
  var data = { fields: {}, values: {} };

  options = options || {};

  if (el && 'form' === el.nodeName.toLowerCase()) {
    each(el.querySelectorAll('[data-recurly]'), function (field) {
      var name = dom.data(field, 'recurly');
      if (~index(whitelist, name)) {
        data.fields[name] = field;
        data.values[name] = dom.value(field);
      }
    });
  } else {
    data.values = input;
  }

  if (options.parseCard) {
    data.values.number = parseCard(data.values.number);
  }

  return data;
};
