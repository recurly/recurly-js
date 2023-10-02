import assert from 'assert';
import isEmpty from 'lodash.isempty';
import Promise from 'promise';
import { Recurly } from '../../lib/recurly';
import { initRecurly } from './support/helpers';
import { Request } from '../../lib/recurly/request';

describe('Request', () => {
  beforeEach(function () {
    const recurly = this.recurly = initRecurly();
    this.request = new Request({ recurly });
  });

  describe('Request.timeout', () => {
    it('respects the recurly config property', function () {
      assert.strictEqual(this.request.timeout, this.recurly.config.timeout);
      this.recurly.config.timeout = 10;
      assert.strictEqual(this.request.timeout, 10);
    });
  });

  describe('Request.key', () => {
    it('respects the recurly config property', function () {
      assert.strictEqual(this.request.key, this.recurly.config.publicKey);
      this.recurly.configure({ publicKey: 'test-value' });
      assert.strictEqual(this.request.key, 'test-value');
    });
  });

  describe('Request.deviceId', () => {
    it('defers to recurly.deviceId', function () {
      assert.strictEqual(this.request.deviceId, this.recurly.deviceId);
    });
  });

  describe('Request.sessionId', () => {
    it('defers to recurly.sessionId', function () {
      assert.strictEqual(this.request.sessionId, this.recurly.sessionId);
    });
  });

  describe('Request.version', () => {
    describe('when Recurly is configured as a parent', () => {
      it('returns recurly.version', function () {
        assert.strictEqual(this.request.version, this.recurly.version);
        this.recurly.configure({ publicKey: 'test-value' });
        assert.strictEqual(this.request.key, 'test-value');
      });
    });

    describe('when Recurly is configured as a dependent', () => {
      beforeEach(function () {
        const recurly = this.recurly = initRecurly({ parent: false, parentVersion: 'test-parent-version' });
        this.request = new Request({ recurly });
      });

      it('returns recurly.parentVersion', function () {
        assert.strictEqual(this.request.version, this.recurly.config.parentVersion);
        assert.strictEqual(this.request.version, 'test-parent-version');
      });
    });
  });

  describe('External API', () => {
    beforeEach(function () {
      sinon.spy(this.request, 'request');
      sinon.spy(this.request, 'cached');
    });

    afterEach(function () {
      this.request.request.restore();
      this.request.cached.restore();
    });

    const example = {
      route: 'example',
      data: { arbitrary: 'data', example: 2 },
      done: () => {}
    };

    describe('Request.get', () => {
      const exampleMatch = {
        method: 'get',
        route: sinon.match(example.route),
        data: sinon.match(example.data)
      };

      it('invokes Request.request with method = get and all passed parameters', function () {
        this.request.get(example);
        assert(this.request.request.calledOnce);
        assert(this.request.request.calledWithMatch(exampleMatch));
      });

      it('performes a cached call when cached = true', function () {
        this.request.get(Object.assign({}, example, { cached: true }));
        assert(this.request.cached.calledOnce);
        assert(this.request.cached.calledWithMatch(exampleMatch));
      });
    });

    describe('Request.post', () => {
      const exampleMatch = {
        method: 'post',
        route: sinon.match(example.route),
        data: sinon.match(example.data)
      };

      it('invokes Request.request with method = post and all passed parameters', function () {
        this.request.post(example);
        assert(this.request.request.calledOnce);
        assert(this.request.request.calledWithMatch(exampleMatch));
      });

      it('performes a cached call when cached = true', function () {
        this.request.post(Object.assign({}, example, { cached: true }));
        assert(this.request.cached.calledOnce);
        assert(this.request.cached.calledWithMatch(exampleMatch));
      });
    });
  });

  describe('Request.request', () => {
    it('Handles an empty response', function (done) {
      const stub = sinon.stub();
      this.request.request({ method: 'post', route: '/events' })
        .done(res => {
          assert.strictEqual(res, undefined);
          assert(stub.notCalled);
          done();
        }, stub);
    });

    describe('Additional parameters', () => {
      beforeEach(function () { sinon.spy(this.request, 'xhr'); });
      afterEach(function () { this.request.xhr.restore(); });

      it('Applies Recurly.version to the request', function () {
        let data = { example: 0 };
        this.request.request({ method: 'get', route: 'test', data });
        assert(this.request.xhr.calledWithMatch({ data: { example: 0, version: this.recurly.version } }));
      });

      it('Applies Recurly.key to the request', function () {
        let data = { example: 0 };
        this.request.request({ method: 'get', route: 'test', data });
        assert(this.request.xhr.calledWithMatch({ data: { example: 0, key: this.recurly.config.publicKey } }));
      });

      it('Applies Recurly.deviceId to the request', function () {
        let data = { example: 0 };
        this.request.request({ method: 'get', route: 'test', data });
        assert(this.request.xhr.calledWithMatch({ data: { example: 0, deviceId: this.recurly.deviceId } }));
      });

      it('Applies Recurly.sessionId to the request', function () {
        let data = { example: 0 };
        this.request.request({ method: 'get', route: 'test', data });
        assert(this.request.xhr.calledWithMatch({ data: { example: 0, sessionId: this.recurly.sessionId } }));
      });
    });

    describe('when configured for jsonp requests', () => {
      beforeEach(function () {
        const recurly = this.recurly = initRecurly({ cors: false });
        this.request = new Request({ recurly });
      });

      beforeEach(function () { sinon.spy(this.request, 'jsonp'); });
      afterEach(function () { this.request.jsonp.restore(); });

      it('invokes Request.jsonp', function () {
        assert.strictEqual(this.request.shouldUseXHR, false);
        this.request.request({ method: 'get', route: 'test' });
        assert(this.request.jsonp.calledOnce);
        assert(this.request.jsonp.calledWithMatch({ url: sinon.match('test') }));
      });
    });

    describe('when configured for XHR requests', () => {
      beforeEach(function () {
        const recurly = this.recurly = initRecurly({ cors: true });
        this.request = new Request({ recurly });
      });

      it('invokes Request.xhr', function () {
        sinon.spy(this.request, 'xhr');
        this.request.request({ method: 'get', route: 'test' });
        assert(this.request.xhr.calledOnce);
        assert(this.request.xhr.calledWithMatch({
          method: 'get',
          url: sinon.match('test')
        }));
        this.request.xhr.restore();
      });

      describe('downstream request.xhr network calls', () => {
        before(function () {
          this.example = {
            string: '789-xyz',
            number: 1,
            object: {
              string: 'abc-xyz-123'
            },
            arrayOfObjects: [{ key: 'value', number: 0 }, { float: 1.23456, string: '123456' }],
            arrayOfArrays: [[0, 1, 2, 3, 4],['a', 'b', 'c', 'd', 'e']]
          };
          this.exampleEncoded = () => `
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
            &version=${this.recurly.version}
            &key=test
            &deviceId=${this.recurly.deviceId}
            &sessionId=${this.recurly.sessionId}
            &instanceId=${this.recurly.id}
            `.replace(/\n|\s/g, '');

          this.XHR = (function () {
            const XHR = window.XMLHttpRequest;
            const XDM = window.XDomainRequest;
            if (XHR && 'withCredentials' in new XHR) return XHR;
            if (XDM) return XDM;
          })();
        });

        beforeEach(function () {
          sinon.spy(this.XHR.prototype, 'open');
          sinon.spy(this.XHR.prototype, 'send');
          sinon.spy(this.XHR.prototype, 'setRequestHeader');
        });

        afterEach(function () {
          this.XHR.prototype.open.restore();
          this.XHR.prototype.send.restore();
          this.XHR.prototype.setRequestHeader.restore();
        });

        describe('when performing a POST request', () => {
          beforeEach(function (done) {
            const proceed = () => done();
            this.request.request({ method: 'post', route: '/test', data: this.example }).done(proceed, proceed);
          });

          it('sends properly-encoded data in the request body', function () {
            assert(this.XHR.prototype.open.calledWithExactly('post', `${this.recurly.config.api}/test`));
            assert(this.XHR.prototype.send.calledWithExactly(this.exampleEncoded()));
          });
        });

        describe('when performing a GET request', () => {
          beforeEach(function (done) {
            const proceed = () => done();
            this.request.request({ method: 'get', route: '/test', data: this.example }).done(proceed, proceed);
          });

          it('appends properly-encoded data to the url', function () {
            const url = `${this.recurly.config.api}/test?${this.exampleEncoded()}`;
            assert(this.XHR.prototype.open.calledWithExactly('get', url));
            assert(this.XHR.prototype.send.calledWith());
          });
        });

        describe('when configured with a hostname', () => {
          it('Applies the hostname as a header', function () {
            this.recurly.configure({ hostname: 'test-hostname.recurly.com' });
            this.request.request({ method: 'get', route: 'test' });
            assert(this.XHR.prototype.setRequestHeader.calledWithMatch('Recurly-Credential-Checkout-Hostname', 'test-hostname.recurly.com'));
          });
        });
      });
    });
  });

  describe('Request.cached', () => {
    const data = { arbitrary: 'payload' };

    it('on first call, invokes Request.request with identical parameters', function () {
      sinon.spy(this.request, 'request');
      this.request.cached({ method: 'get', route: 'test', data });
      assert(this.request.request.calledOnce);
      assert(this.request.request.calledWithMatch({ method: 'get', route: 'test', data }));
      this.request.request.restore();
    });

    it('returns and does not cache error responses', function (done) {
      this.request.cached({ method: 'get', route: '/test', data })
        .done(() => {}, err => {
          assert(err);
          assert(isEmpty(this.request.cache));
          done();
        });
    });

    describe('given a successful response', () => {
      beforeEach(function () {
        sinon.stub(this.request, 'request');
        this.request.request.usingPromise(Promise).resolves({ success: true });
      });

      afterEach(function () { this.request.request.restore(); })

      it('returns and caches successful responses', function (done) {
        this.request.cached({ method: 'get', route: 'test', data }).done(res => {
          assert.equal(res.success, true);
          assert.equal(Object.keys(this.request.cache).length, 1);
          done();
        });
      });

      it(`invokes recurly.request on the first call, and not on the
          second, with identical responses for both requests`, function (done) {
        this.request.cached({ method: 'get', route: 'test', data }).done(res => {
          assert(this.request.request.calledOnce);
          this.request.cached({ method: 'get', route: 'test', data }).done(res => {
            assert(this.request.request.calledOnce);
            assert.equal(Object.keys(this.request.cache).length, 1);
            done();
          });
        });
      });
    });
  });

  describe('Request.queued', () => {
    const args = { method: 'get', route: 'test', data: { arbitrary: 'payload' } };

    describe('when recurly is not configured', () => {
      beforeEach(function () {
        const recurly = this.recurly = new Recurly;
        this.request = new Request({ recurly });
      });

      it('adds the request to the queue', function () {
        assert.strictEqual(this.recurly.listeners('configured').length, 0);
        this.request.queued(args);
        assert.strictEqual(this.recurly.listeners('configured').length, 1);
      });

      it('executes the queue once configured', function (done) {
        const step = res => {
          assert.strictEqual(this.recurly.listeners('configured').length, 0);
          done();
        };
        assert.strictEqual(this.recurly.listeners('configured').length, 0);
        this.request.queued(args).then(step);
        assert.strictEqual(this.recurly.listeners('configured').length, 1);
        initRecurly(this.recurly);
      });
    });

    it('executes immediately when recurly is configured', function () {
      sinon.spy(this.request, 'request');
      this.request.queued(args);
      assert(this.request.request.calledOnce);
      assert(this.request.request.calledWithMatch(args));
      this.request.request.restore();
    });
  });

  describe('Request.piped', () => {
    let data = {
      long: Array.apply(null, Array(200)).map(() => 1)
    };

    describe('given all error responses', () => {
      beforeEach(function () {
        sinon.stub(this.request, 'request');
        this.request.request.usingPromise(Promise).rejects({ code: 'not-found'});
      });

      it('responds with an error', function (done) {
        this.request.piped({ method: 'get', route: 'test', data, by: 'long' })
          .done(() => {}, err => {
            assert.equal(err.code, 'not-found');
            done();
          });
      });
    });

    describe('given successful responses', () => {
      beforeEach(function () {
        sinon.stub(this.request, 'request');
        this.request.request.usingPromise(Promise).resolves({ success: true });
      });

      it('spreads a long request set across multiple requests with a default size of 100', function (done) {
        this.request.piped({ method: 'get', route: 'test', data, by: 'long' })
          .done(() => {
            assert(this.request.request.calledTwice);
            done();
          })
      });

      it('spreads a long request set across multiple requests with given a custom size', function (done) {
        this.request.piped({ method: 'get', route: 'test', data, by: 'long', size: 10 })
          .done(() => {
            assert.equal(this.request.request.callCount, 20);
            done();
          })
      });

      it('responds with the first response if it is an object', function (done) {
        this.request.piped({ method: 'get', route: 'test', data, by: 'long' })
          .done(res => {
            assert.equal(res.success, true);
            done();
          })
      });

      it('responds with a flattened response set if the responses are arrays', function (done) {
        this.request.request.resolves([{ success: true }]);
        this.request.piped({ method: 'get', route: 'test', data, by: 'long', size: 10 })
          .done(set => {
            assert.equal(set.length, 20);
            set.forEach(res => assert.equal(res.success, true));
            done();
          })
      });
    });
  });

  describe('Request.jsonp', () => {
    beforeEach(function () {
      const { timeout } = this.request;

      this.exampleOkUrl = this.recurly.url('/mock-200');
      this.exampleErrUrl = this.recurly.url('/mock-200-err');

      sinon.spy(Request, 'makeJsonpRequest');
    });

    afterEach(function () {
      if (!('restore' in Request.makeJsonpRequest)) return;
      Request.makeJsonpRequest.restore();
    });

    it('makes a call to the specified url', function () {
      const { exampleOkUrl } = this;

      this.request.jsonp({
        url: exampleOkUrl,
        data: {}
      });

      assert(Request.makeJsonpRequest.calledOnce);

      assert.strictEqual(
        Request.makeJsonpRequest.firstCall.firstArg,
        `${exampleOkUrl}?`
      );
    });

    describe('when instructed to mimic a POST request', () => {
      it('sets _method in the request', function () {
        const { exampleOkUrl } = this;

        this.request.jsonp({
          method: 'post',
          url: exampleOkUrl,
          data: {}
        });

        assert(Request.makeJsonpRequest.calledOnce);

        assert.strictEqual(
          Request.makeJsonpRequest.firstCall.firstArg,
          `${exampleOkUrl}?_method=post`
        );
      });
    });

    it('encodes the payload in the querystring', function () {
      const { exampleOkUrl, expectedOptions } = this;

      const examplePayload = {
        arbitrary: 'data payload!',
        with: 1.1,
        mixed: true,
        types: {
          evenNested: ['x','y']
        }
      };

      const examplePayloadEncoded = `
        arbitrary=data%20payload%21&with=1.1&mixed=true&types[evenNested][0]=x&types[evenNested][1]=y
      `.trim();

      this.request.jsonp({
        url: exampleOkUrl,
        data: examplePayload
      });

      assert(Request.makeJsonpRequest.calledOnce);

      assert.strictEqual(
        Request.makeJsonpRequest.firstCall.firstArg,
        `${exampleOkUrl}?${examplePayloadEncoded}`
      );
    });

    it('resolves when the response is shaped like a success', function (done) {
      const { exampleOkUrl } = this;

      this.request.jsonp({
        url: exampleOkUrl,
        data: {}
      }).then(response => {
        assert.strictEqual(response, '');
        done();
      }, err => {});
    });

    it('rejects when the response is shaped like an error', function (done) {
      const { exampleErrUrl } = this;

      this.request.jsonp({
        url: exampleErrUrl,
        data: {}
      }).then(() => {}, err => {
        assert.strictEqual(err.name, 'api-error');
        assert.strictEqual(err.code, 'error');
        assert.strictEqual(err.message, 'An error');
        done();
      });
    });
  });
});
