import merge from 'lodash.merge';
import {Recurly} from '../../lib/recurly';

export function initRecurly (opts) {
  let recurly = new Recurly;
  recurly.configure(merge({
    publicKey: 'test',
    api: `//${global.location.host}/api`
  }, opts));
  return recurly;
}

export function apiTest (suite) {
  suite('cors');
  suite('jsonp');
}

export function domTest (suite) {
  suite(testBed(), () => testBed().innerHTML = '');
}

export function testBed () {
  let el = global.document.getElementById('dom-testbed');
  if (!el) {
    el = global.document.createElement('div')
    el.id = 'dom-testbed';
    global.document.body.appendChild(el);
  }
  return el;
}
