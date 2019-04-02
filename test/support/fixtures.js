import { testBed } from './helpers';

const elements = opts => `
  <form action="#" id="test-form">
    <div id="recurly-elements"></div>
    <input type="text" data-recurly="first_name" value="${opts.first_name || ''}">
    <input type="text" data-recurly="last_name" value="${opts.last_name || ''}">
    <input type="hidden" data-recurly="token" name="recurly-token">
  </form>
`;

const minimal = opts => `
  <form action="#" id="test-form">
    <div data-recurly="number"></div>
    <div data-recurly="month"></div>
    <div data-recurly="year"></div>
    <div data-recurly="cvv"></div>
    <input type="text" data-recurly="first_name" value="${opts.first_name || ''}">
    <input type="text" data-recurly="last_name" value="${opts.last_name || ''}">
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

const pricing = opts => `
  <div id="test-pricing">
    <input type="text" data-recurly="plan" value="${fetch(opts, 'plan', '')}">
    <input type="text" data-recurly="plan_quantity" value="${fetch(opts, 'plan_quantity', '')}">
    <input type="text" data-recurly="coupon" value="${fetch(opts, 'coupon', '')}">
    <input type="text" data-recurly="gift_card" value="${fetch(opts, 'giftcard', '')}">
    ${opts.addon ? `<input type="text" data-recurly="addon" data-recurly-addon="${fetch(opts.addon, 'code')}" value="${fetch(opts.addon, 'quantity')}">` : ''}
    <input type="text" data-recurly="currency" value="${fetch(opts, 'currency', 'USD')}">
    <input type="text" data-recurly="country" value="${fetch(opts, 'country', 'US')}">
    <input type="text" data-recurly="postal_code" value="${fetch(opts, 'postal_code', '')}">
    <input type="text" data-recurly="tax_code" value="${fetch(opts, 'tax_code', '')}">
    <input type="text" data-recurly="vat_number" value="${fetch(opts, 'vat_number', '')}">
    ${'tax_amount.now' in opts ? `<input type="text" data-recurly="tax_amount.now" value="${fetch(opts, 'tax_amount.now', '')}">` : ''}
    ${'tax_amount.next' in opts ? `<input type="text" data-recurly="tax_amount.next" value="${fetch(opts, 'tax_amount.next', '')}">` : ''}

    ${opts['shipping_address.country'] ? `<input type="text" data-recurly="shipping_address.country" value="${fetch(opts, 'shipping_address.country', '')}">` : '' }
    ${opts['shipping_address.postal_code'] ? `<input type="text" data-recurly="shipping_address.postal_code" value="${fetch(opts, 'shipping_address.postal_code', '')}">` : '' }

    <span data-recurly="total_now"></span>
    <span data-recurly="subtotal_now"></span>
    <span data-recurly="addons_now"></span>
    <span data-recurly="discount_now"></span>
    <span data-recurly="setup_fee_now"></span>
    <span data-recurly="tax_now"></span>

    <span data-recurly="total_next"></span>
    <span data-recurly="subtotal_next"></span>
    <span data-recurly="addons_next"></span>
    <span data-recurly="discount_next"></span>
    <span data-recurly="setup_fee_next"></span>
    <span data-recurly="tax_next"></span>

    <span data-recurly="currency_code"></span>
    <span data-recurly="currency_symbol"></span>
  </div>
`;

const checkoutPricing = opts => `
  <div id="test-pricing">
    <input type="text" data-recurly-subscription="sub-0" data-recurly="plan" value="${fetch(opts, 'sub_0_plan', '')}">
    <input type="text" data-recurly-subscription="sub-0" data-recurly="plan_quantity" value="${fetch(opts, 'sub_0_plan_quantity', '')}">
    <input type="text" data-recurly-subscription="sub-0" data-recurly="tax_code" value="${fetch(opts, 'sub_0_tax_code', '')}">

    <input type="text" data-recurly-subscription="sub-1" data-recurly="plan" value="${fetch(opts, 'sub_1_plan', '')}">
    <input type="text" data-recurly-subscription="sub-1" data-recurly="plan_quantity" value="${fetch(opts, 'sub_1_plan_quantity', '')}">
    <input type="text" data-recurly-subscription="sub-1" data-recurly="tax_code" value="${fetch(opts, 'sub_1_tax_code', '')}">

    <input type="text" value="${fetch(opts, 'adj_0')}"
      data-recurly="adjustment"
      data-recurly-adjustment="adj-0"
      data-recurly-adjustment-amount="10"
      data-recurly-adjustment-tax-code="adj-tax-code-0"
    >

    <input type="text" value="${fetch(opts, 'adj_1')}"
      data-recurly="adjustment"
      data-recurly-adjustment="adj-1"
      data-recurly-adjustment-amount="20"
      data-recurly-adjustment-tax-code="adj-tax-code-1"
    >

    <input type="text" data-recurly="coupon" value="${fetch(opts, 'coupon', '')}">
    <input type="text" data-recurly="gift_card" value="${fetch(opts, 'giftcard', '')}">
    <input type="text" data-recurly="currency" value="${fetch(opts, 'currency', 'USD')}">
    <input type="text" data-recurly="country" value="${fetch(opts, 'country', 'US')}">
    <input type="text" data-recurly="postal_code" value="${fetch(opts, 'postal_code', '')}">
    <input type="text" data-recurly="vat_number" value="${fetch(opts, 'vat_number', '')}">
    ${'tax_amount.now' in opts ? `<input type="text" data-recurly="tax_amount.now" value="${fetch(opts, 'tax_amount.now', '')}">` : ''}
    ${'tax_amount.next' in opts ? `<input type="text" data-recurly="tax_amount.next" value="${fetch(opts, 'tax_amount.next', '')}">` : ''}

    <span data-recurly="total_now"></span>
    <span data-recurly="subtotal_now"></span>
    <span data-recurly="subscriptions_now"></span>
    <span data-recurly="adjustments_now"></span>
    <span data-recurly="discount_now"></span>
    <span data-recurly="gift_card_now"></span>
    <span data-recurly="taxes_now"></span>

    <span data-recurly="total_next"></span>
    <span data-recurly="subtotal_next"></span>
    <span data-recurly="subscriptions_next"></span>
    <span data-recurly="adjustments_next"></span>
    <span data-recurly="discount_next"></span>
    <span data-recurly="gift_card_next"></span>
    <span data-recurly="taxes_next"></span>

    <span data-recurly="currency_code"></span>
    <span data-recurly="currency_symbol"></span>
  </div>
`;

const multipleForms = opts => `
  <form action="#" id="test-form-1">
    <div id="number-1"></div>
    <div id="month-1"></div>
    <div id="year-1"></div>
    <div id="cvv-1"></div>
    <input type="hidden" data-recurly="token" name="recurly-token">
  </form>

  <form action="#" id="test-form-2">
    <div id="number-2"></div>
    <div id="month-2"></div>
    <div id="year-2"></div>
    <div id="cvv-2"></div>
    <input type="hidden" data-recurly="token" name="recurly-token">
  </form>
`;

const iframe = opts => `
  <iframe
    id="${fetch(opts, 'id', 'test-iframe')}"
    src="${fetch(opts, 'src', 'https://google.com')}"
  ></iframe>
`;

const threeDSecure = opts => `<div id="three-d-secure-container"></div>`;

const empty = '';

const FIXTURES = {
  elements,
  minimal,
  all,
  bank,
  pricing,
  checkoutPricing,
  multipleForms,
  iframe,
  threeDSecure,
  empty,
};

export function applyFixtures () {
  beforeEach(function () {
    const ctx = this.currentTest.ctx;
    if (ctx.fixture) fixture(ctx.fixture, ctx.fixtureOpts);
  });

  afterEach(function () {
    if (this.currentTest.ctx.fixture) fixture();
  });
}

export function fixture (name, opts = {}) {
  const tpl = FIXTURES[name] || (() => {});
  testBed().innerHTML = tpl(opts);
}

/**
 * fetches a value on an object or returns an alternative
 * @param  {Object} object
 * @param  {String} prop
 * @param  {[Mixed]} def default value
 * @return {Mixed} value of property on object or default if none found
 */
function fetch (object, prop, def = '') {
  return object.hasOwnProperty(prop) ? object[prop] : def;
}
