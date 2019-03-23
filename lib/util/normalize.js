import dom from './dom';
import each from 'component-each';
import { parseCard } from '../util/parse-card';

/**
 * Parses options out of a form element and normalizes according to a whitelist.
 *
 * @param {Array} whitelist of field names
 * @param {Object|HTMLFormElement} input
 * @param {Object} [options] [description]
 * @param {Boolean} [options.parseCard] whether to parse the card number value
 * @return {Object}
 */

export function normalize (input, whitelist, options = {}) {
  let data = { fields: {}, values: {} };
  let el = dom.element(input);

  if (el && 'form' === el.nodeName.toLowerCase()) {
    each(el.querySelectorAll('[data-recurly]'), function (field) {
      let name = dom.data(field, 'recurly');
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
}
