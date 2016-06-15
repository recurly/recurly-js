import {testBed} from './helpers';

const blank = '';

const minimal = `
  <form action="#" id="test-form">
    <div data-recurly="number"></div>
    <div data-recurly="month"></div>
    <div data-recurly="year"></div>
    <div data-recurly="cvv"></div>
    <input type="hidden" data-recurly="token" name="recurly-token">
  </form>
`;

const all = opts => `
  <form action="#" id="test-form">
    <div data-recurly="number"></div>
    <div data-recurly="month"></div>
    <div data-recurly="year"></div>
    <div data-recurly="cvv"></div>
    <input type="text" data-recurly="first_name" value="${fetch(opts, 'first_name', '')}">
    <input type="text" data-recurly="last_name" value="${fetch(opts, 'last_name', '')}">
    <input type="text" data-recurly="address1" value="${fetch(opts, 'address1', '')}">
    <input type="text" data-recurly="address2" value="${fetch(opts, 'address2', '')}">
    <input type="text" data-recurly="city" value="${fetch(opts, 'city', '')}">
    <input type="text" data-recurly="state" value="${fetch(opts, 'state', '')}">
    <input type="text" data-recurly="postal_code" value="${fetch(opts, 'postal_code', '')}">
    <input type="text" data-recurly="phone" value="${fetch(opts, 'phone', '')}">
    <input type="text" data-recurly="vat_number" value="${fetch(opts, 'vat_number', '')}">
    <input type="text" data-recurly="country" value="${fetch(opts, 'country', '')}">
    <input type="hidden" name="recurly-token" data-recurly="token">
  </form>
`;

const bank = opts => `
  <form action="#" id="test-form">
    <input type="text" data-recurly="name_on_account" value="${fetch(opts, 'name_on_account', '')}">
    <input type="text" data-recurly="routing_number" value="${fetch(opts, 'routing_number', '')}">
    <input type="text" data-recurly="account_number" value="${fetch(opts, 'account_number', '')}">
    <input type="text" data-recurly="account_number_confirmation" value="${fetch(opts, 'account_number_confirmation', '')}">
    <input type="text" data-recurly="account_type" value="${fetch(opts, 'account_type', '')}">
    <input type="text" data-recurly="address1" value="${fetch(opts, 'address1', '')}">
    <input type="text" data-recurly="address2" value="${fetch(opts, 'address2', '')}">
    <input type="text" data-recurly="city" value="${fetch(opts, 'city', '')}">
    <input type="text" data-recurly="state" value="${fetch(opts, 'state', '')}">
    <input type="text" data-recurly="postal_code" value="${fetch(opts, 'postal_code', '')}">
    <input type="text" data-recurly="country" value="${fetch(opts, 'country', '')}">
    <input type="text" data-recurly="phone" value="${fetch(opts, 'phone', '')}">
    <input type="text" data-recurly="vat_number" value="${fetch(opts, 'vat_number', '')}">
    <input type="hidden" name="recurly-token" data-recurly="token">
    <button>submit</button>
  </form>
`;

const fixtures = {blank, minimal, all, bank};

export function applyFixtures () {
  beforeEach(function () {
    const ctx = this.currentTest.ctx;
    if (ctx.fixture) fixture(ctx.fixture, ctx.fixtureOpts);
  });

  afterEach(function () {
    if (this.currentTest.ctx.fixture) fixture();
  });
}

export function fixture (name = 'blank', opts = {}) {
  const tpl = fixtures[name] || '';
  const html = typeof tpl === 'function' ? tpl(opts) : tpl;
  testBed().innerHTML = html;
}


/**
 * fetches a value on an object or returns an alternative
 * @param  {[type]} object [description]
 * @param  {[type]} prop   [description]
 * @param  {[type]} def    [description]
 * @return {[type]}        [description]
 */
function fetch (object, prop, def = '') {
  return object.hasOwnProperty(prop) ? object[prop] : def;
}
