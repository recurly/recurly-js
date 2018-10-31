import bowser from 'bowser';
import merge from 'lodash.merge';
import {Recurly} from '../../lib/recurly';
import {BRAINTREE_CLIENT_VERSION} from '../../lib/recurly/paypal/strategy/braintree';

/**
 * initializes a Recurly instance designed for testing
 * @param  {[Recurly]} recurly
 * @param  {Object} opts
 * @return {Recurly}
 */
export function initRecurly (recurly, opts) {
  if (!(recurly instanceof Recurly)) {
    if (!opts) opts = recurly;
    recurly = new Recurly;
  }
  recurly.configure(merge({
    publicKey: 'test',
    api: `${window.location.protocol}//${window.location.host}/api`
  }, opts));
  return recurly;
}

export function apiTest (suite) {
  suite('cors');
  suite('jsonp');
}

export function testBed () {
  let el = window.document.getElementById('dom-testbed');
  if (!el) {
    el = window.document.createElement('div')
    el.id = 'dom-testbed';
    window.document.body.appendChild(el);
  }
  return el;
}

export function nextTick (cb) {
  setTimeout(cb, 0);
}

export function braintreeStub () {
  beforeEach(() => {
    const create = (opt, cb) => cb(null, {});
    window.braintree = {
      client: {
        VERSION: BRAINTREE_CLIENT_VERSION,
        create
      },
      paypal: { create },
      dataCollector: { create }
    };
  });

  afterEach(() => delete window.braintree);
}

export function isUuidv4 (example) {
  const matcher = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return matcher.test(example);
}

export function stubAsMobileDevice () {
  beforeEach(function () {
    this.mobileStubSandbox = sinon.createSandbox();
    if (bowser.mobile === true) return;
    if (!bowser.hasOwnProperty('mobile')) bowser.mobile = undefined;
    this.mobileStubSandbox.stub(bowser, 'mobile').value(true);
  });

  afterEach(function () {
    this.mobileStubSandbox.restore();
  });
}

export function stubAsNonMobileDevice () {
  beforeEach(function () {
    this.mobileStubSandbox = sinon.createSandbox();
    if ('mobile' in bowser) this.mobileStubSandbox.stub(bowser, 'mobile').value(false);
    if ('tablet' in bowser) this.mobileStubSandbox.stub(bowser, 'tablet').value(false);
  });

  afterEach(function () {
    this.mobileStubSandbox.restore()
  });
}
