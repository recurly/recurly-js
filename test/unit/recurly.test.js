
var assert = require('assert');
var noop = require('noop');

describe('Recurly', function () {
  var Recurly = window.recurly.Recurly;
  var recurly;

  beforeEach(function () {
    recurly = new Recurly();
  });

  it('should have a version', function () {
    assert('string' === typeof recurly.version);
  });

  it('should be an event emitter', function () {
    assert(recurly.on && recurly.emit);
  });

  it('should be exposed as a global singleton', function () {
    assert(window.recurly instanceof Recurly);
  });

  describe('Recurly.request', function () {
    var cors = false;

    beforeEach(function () {
      recurly.configure({
        publicKey: 'test',
        api: '//' + window.location.host,
        cors: cors
      });
    });

    describe('when configured for jsonp requests', function () {
      it('invokes recurly.jsonp', function () {
        sinon.stub(recurly, 'jsonp');
        recurly.request('get', 'test', noop);
        assert(recurly.jsonp.calledOnce);
      });
    });

    describe('when configured for cors requests', function () {
      before(function () {
        cors = true;
      });

      it('invokes recurly.xhr', function () {
        sinon.stub(recurly, 'xhr');
        recurly.request('get', 'test', noop);
        assert(recurly.xhr.calledOnce);
      });
    });
  });
});
