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
    <input type="text" data-recurly="first_name" value="${opts.first_name || ''}">
    <input type="text" data-recurly="last_name" value="${opts.last_name || ''}">
    <input type="text" data-recurly="address1" value="${opts.address1 || ''}">
    <input type="text" data-recurly="address2" value="${opts.address2 || ''}">
    <input type="text" data-recurly="city" value="${opts.city || ''}">
    <input type="text" data-recurly="state" value="${opts.state || ''}">
    <input type="text" data-recurly="postal_code" value="${opts.last_name || ''}">
    <input type="text" data-recurly="phone" value="${opts.phone || ''}">
    <input type="text" data-recurly="vat_number" value="${opts.vat_number || ''}">
    <input type="text" data-recurly="country" value="${opts.country || ''}">
    <input type="hidden" name="recurly-token" data-recurly="token">
  </form>
`;

const bank = opts => `
  <for action="#" id="test-form">
    <input type="text" data-recurly="name_on_account" value="${opts.name_on_account}">
    <input type="text" data-recurly="routing_number" value="${opts.routing_number}">
    <input type="text" data-recurly="account_number" value="${opts.account_number}">
    <input type="text" data-recurly="account_number_confirmation" value="${opts.account_number_confirmation}">
    <input type="text" data-recurly="account_type" value="${opts.account_type}">
    <input type="text" data-recurly="address1" value="${opts.address1}">
    <input type="text" data-recurly="address2" value="${opts.address2}">
    <input type="text" data-recurly="city" value="${opts.city}">
    <input type="text" data-recurly="state" value="${opts.state}">
    <input type="text" data-recurly="postal_code" value="${opts.postal_code}">
    <input type="text" data-recurly="country" value="${opts.country}">
    <input type="text" data-recurly="phone" value="${opts.phone}">
    <input type="text" data-recurly="vat_number" value="${opts.vat_number}">
    <input type="hidden" name="recurly-token" data-recurly="token">
    <button>submit</button>
  </form>
`;

const fixtures = {blank, minimal, all, bank};

export function fixture (name = 'blank', opts = {}) {
  const tpl = fixtures[name] || '';
  const html = typeof tpl === 'function' ? tpl(opts) : tpl;
  testBed().innerHTML = html;
}
