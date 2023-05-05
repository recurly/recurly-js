import bowser from 'bowser';
import merge from 'lodash.merge';
import { Recurly } from '../../../lib/recurly';
import { BRAINTREE_CLIENT_VERSION } from '../../../lib/recurly/paypal/strategy/braintree';
import Promise from 'promise';

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

    // prevents itinerant event logging workers from dispatching
    sinon.stub(recurly.reporter, 'send');
  }
  recurly.configure(merge({
    publicKey: 'test',
    api: `${window.location.protocol}//${window.location.host}/api`
  }, opts));
  return recurly;
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

export function stubBraintree () {
  beforeEach(() => {
    const create = (opt, cb) => cb(null, {
      tokenize: (opts, cb) => {
        cb(null, {})

        return {
          close: () => {}
        }
      }
    });

    const venmoCreate = (opt, cb) => cb(null, {
      tokenize: () => Promise.resolve({}),
      close: () => {}
    });

    window.braintree = {
      client: {
        VERSION: BRAINTREE_CLIENT_VERSION,
        create
      },
      venmo: {
        create: venmoCreate
      },
      paypal: { create },
      dataCollector: { create }
    };
  });

  afterEach(() => delete window.braintree);
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

export function stubWindowOpen () {
  beforeEach(function () {
    this.newWindow = { close: sinon.stub() };
    this.windowOpenSandbox = sinon.createSandbox();

    this.windowOpenSandbox.stub(window, 'open').callsFake(url => {
      this.newWindowEventName = url.match(/(recurly-frame-\w+-\w+)/)[0];
      return this.newWindow;
    });
  });

  afterEach(function () {
    window.open.restore();
    this.windowOpenSandbox.restore();
  });
}

/**
 * Creates a native browser Event
 *
 * @param {String} name
 * @return {Event}
 */
export function createNativeEvent (name) {
  if (typeof Event === 'function') return new Event(name);
  // IE11 compatibility case
  const event = window.document.createEvent('Event');
  event.initEvent(name, true, true);
  return event;
}

export function assertDone (done, assertCb) {
  try {
    assertCb();
    done();
  } catch (err) {
    done(err);
  }
}

export function stubGooglePaymentAPI (options) {
  options.loadLibs ||= Promise.resolve(true);
  options.isReadyToPay ||= Promise.resolve({ result: true });
  options.loadPaymentData ||= Promise.resolve({
    paymentMethodData: {
      description: 'Visa •••• 1111',
      tokenizationData: {
        type: 'PAYMENT_GATEWAY',
        token: '{"id": "tok_123"}',
      },
      type: 'CARD',
      info: {
        cardNetwork: 'VISA',
        cardDetails: '1111',
        billingAddress: {
          address3: '',
          sortingCode: '',
          address2: '',
          countryCode: 'US',
          address1: '1600 Amphitheatre Parkway',
          postalCode: '94043',
          name: 'John Smith',
          locality: 'Mountain View',
          administrativeArea: 'CA',
        },
      },
    },
  });
  const { dom, loadLibs, isReadyToPay, loadPaymentData } = options;

  const sandBox = sinon.createSandbox();

  const PaymentsClient = sandBox.stub();
  PaymentsClient.prototype.isReadyToPay = sandBox.stub().resolves(isReadyToPay);
  PaymentsClient.prototype.createButton = sandBox.stub().callsFake(properties => ({
    properties,
    click: properties.onClick
  }));
  PaymentsClient.prototype.loadPaymentData = sandBox.stub().resolves(loadPaymentData);
  PaymentsClient.prototype.prefetchPaymentData = sandBox.stub();

  sandBox.stub(dom, 'loadLibs')
    .resolves(loadLibs.then(() => {
      window.google = {
        payments: { api: { PaymentsClient } }
      };
    }));

  return () => {
    sandBox.restore();
    delete window.google;
  };
}
