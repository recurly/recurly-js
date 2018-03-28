import assert from 'assert';
import isEmpty from 'lodash.isempty';
import jsonp from 'jsonp';
import {Recurly} from '../lib/recurly';
import CheckoutPricing from '../lib/recurly/pricing/checkout';
import SubscriptionPricing from '../lib/recurly/pricing/subscription';
import {initRecurly} from './support/helpers';

describe('Recurly', () => {
  let recurly;

  beforeEach(() => recurly = new Recurly);

  it('should have a version', () => assert(typeof recurly.version === 'string'));
  it('should be an event emitter', () => assert(recurly.on && recurly.emit));
  it('should be exposed as a global singleton', () => {
    assert(window.recurly instanceof window.recurly.Recurly)
  });

  describe('Pricing factories', () => {
    it('has a CheckoutPricing factory at recurly.Pricing.Checkout', function () {
      assert(recurly.Pricing.Checkout() instanceof CheckoutPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing.Subscription', function () {
      assert(recurly.Pricing.Subscription() instanceof SubscriptionPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing', function () {
      assert(recurly.Pricing() instanceof SubscriptionPricing);
    });
  });

  describe('Recurly.request, Recurly.xhr, and Recurly.jsonp', () => {
    beforeEach(() => recurly = initRecurly({ cors: false }));

    describe('when configured for jsonp requests', () => {
      it('invokes recurly.jsonp', () => {
        sinon.stub(recurly, 'jsonp');
        recurly.request('get', 'test', () => {});
        assert(recurly.jsonp.calledOnce);
      });
    });

    describe('when configured for cors requests', () => {
      beforeEach(() => recurly = initRecurly({ cors: true }));

      it('invokes recurly.xhr', () => {
        sinon.stub(recurly, 'xhr');
        recurly.request('get', 'test', () => {});
        assert(recurly.xhr.calledOnce);
      });

      describe('network calls', () => {
        const example = {
          string: '789-xyz',
          number: 1,
          object: {
            string: 'abc-xyz-123'
          },
          arrayOfObjects: [{ key: 'value', number: 0 }, { float: 1.23456, string: '123456' }],
          arrayOfArrays: [[0, 1, 2, 3, 4],['a', 'b', 'c', 'd', 'e']]
        };
        const exampleEncoded = `
          string=789-xyz
          &number=1
          &object[string]=abc-xyz-123
          &arrayOfObjects[0][key]=value
          &arrayOfObjects[0][number]=0
          &arrayOfObjects[1][float]=1.23456
          &arrayOfObjects[1][string]=123456
          &arrayOfArrays[0][0]=0
          &arrayOfArrays[0][1]=1
          &arrayOfArrays[0][2]=2
          &arrayOfArrays[0][3]=3
          &arrayOfArrays[0][4]=4
          &arrayOfArrays[1][0]=a
          &arrayOfArrays[1][1]=b
          &arrayOfArrays[1][2]=c
          &arrayOfArrays[1][3]=d
          &arrayOfArrays[1][4]=e
          &version=4.8.4
          &key=test`.replace(/\n|\s/g, '');
        const XHR = (function () {
          const XHR = window.XMLHttpRequest;
          const XDM = window.XDomainRequest;
          if (XHR && 'withCredentials' in new XHR) return XHR;
          if (XDM) return XDM;
        })();

        beforeEach(() => {
          sinon.spy(XHR.prototype, 'open');
          sinon.spy(XHR.prototype, 'send');
        });
        afterEach(() => {
          XHR.prototype.open.restore()
          XHR.prototype.send.restore()
        });

        describe('when performing a POST request', () => {
          beforeEach(done => recurly.request('post', '/test', example, () => done()));
          it('sends properly-encoded data in the request body', () => {
            const openCall = XHR.prototype.open.getCall(XHR.prototype.open.callCount - 1);
            const sendCall = XHR.prototype.send.getCall(XHR.prototype.send.callCount - 1);
            assert(openCall.calledWithExactly('post', `${recurly.config.api}/test`));
            assert(sendCall.calledWithExactly(exampleEncoded));
          });
        });

        describe('when performing a GET request', () => {
          beforeEach(done => recurly.request('get', '/test', example, () => done()));
          it('appends properly-encoded data to the url', () => {
            const openCall = XHR.prototype.open.getCall(XHR.prototype.open.callCount - 1);
            const sendCall = XHR.prototype.send.getCall(XHR.prototype.send.callCount - 1);
            assert(openCall.calledWithExactly('get', `${recurly.config.api}/test?${exampleEncoded}`));
            assert(sendCall.calledWith());
          });
        });
      });
    });
  });

  describe('Recurly.cachedRequest', () => {
    const noop = () => {};
    const payload = { arbitrary: 'payload' };

    beforeEach(() => recurly = initRecurly());

    it('on first call, invokes recurly.request with identical parameters', () => {
      sinon.stub(recurly, 'request');
      recurly.cachedRequest('get', 'test', payload, noop);
      assert(recurly.request.calledOnce);
      assert(recurly.request.calledWith('get', 'test', payload));
    });

    it('returns and does not cache error responses', done => {
      recurly.cachedRequest('get', 'test', payload, (err, res) => {
        assert(err);
        assert(isEmpty(recurly._cachedRequests));
        done();
      });
    });

    describe('given a successful response', () => {
      beforeEach(() => {
        sinon.stub(recurly, 'request');
        recurly.request.callsArgWith(3, null, { success: true });
      });

      it('returns and caches successful responses', done => {
        recurly.cachedRequest('get', 'test', payload, (err, res) => {
          assert.equal(err, null);
          assert.equal(res.success, true);
          assert.equal(Object.keys(recurly._cachedRequests).length, 1);
          done();
        });
      });

      it(`invokes recurly.request on the first call, and not on the
          second, with identical responses for both requests`, done => {
        recurly.cachedRequest('get', 'test', payload, (err, res) => {
          assert(recurly.request.calledOnce);
          recurly.cachedRequest('get', 'test', payload, (err, res) => {
            assert(recurly.request.calledOnce);
            assert.equal(Object.keys(recurly._cachedRequests).length, 1);
            done();
          });
        });
      });
    });
  });

  describe('Recurly.pipedRequest', () => {
    const noop = () => {};
    let payload = {
      long: Array.apply(null, Array(200)).map(() => 1)
    }

    beforeEach(() => recurly = initRecurly());

    describe('given all error responses', () => {
      beforeEach(() => {
        sinon.stub(recurly, 'request');
        recurly.request.callsArgWith(3, { code: 'not-found'}, null);
      });

      it('responds with an error', () => {
        recurly.pipedRequest({ method: 'get', route: 'test', data: payload, by: 'long' })
          .catch(err => {
            assert.equal(err.code, 'not-found');
            done();
          })
      });
    });

    describe('given successful responses', () => {
      beforeEach(() => {
        sinon.stub(recurly, 'request');
        recurly.request.callsArgWith(3, null, { success: true });
      });

      it('spreads a long request set across multiple requests with a default size of 100', done => {
        recurly.pipedRequest({ method: 'get', route: 'test', data: payload, by: 'long' })
          .done(() => {
            assert(recurly.request.calledTwice);
            done();
          })
      });

      it('spreads a long request set across multiple requests with given a custom size', done => {
        recurly.pipedRequest({ method: 'get', route: 'test', data: payload, by: 'long', size: 10 })
          .done(() => {
            assert.equal(recurly.request.callCount, 20);
            done();
          })
      });

      it('responds with the first response if it is an object', done => {
        recurly.pipedRequest({ method: 'get', route: 'test', data: payload, by: 'long' })
          .done(res => {
            assert.equal(res.success, true);
            done();
          })
      });

      it('responds with a flattened response set if the responses are arrays', done => {
        recurly.request.callsArgWith(3, null, [{ success: true }]);
        recurly.pipedRequest({ method: 'get', route: 'test', data: payload, by: 'long', size: 10 })
          .done(set => {
            assert.equal(set.length, 20);
            set.forEach(res => assert.equal(res.success, true));
            done();
          })
      });
    });
  });
});
