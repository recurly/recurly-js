import each from 'component-each';
import dom from './dom';
import {parseCard} from '../util/parse-card';

/**
 * Parses options out of a form element and normalizes according to a whitelist.
 *
 * @param {Array} whitelist of field names
 * @param {Object|HTMLFormElement} input
 * @return {Object}
 */

export function normalize (whitelist, input, options) {
  var el = dom.element(input);
  var data = { fields: {}, values: {} };

  options = options || {};

  if (el && 'form' === el.nodeName.toLowerCase()) {
    each(el.querySelectorAll('[data-recurly]'), function (field) {
      var name = dom.data(field, 'recurly');
      if (~whitelist.indexOf(name)) {
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
