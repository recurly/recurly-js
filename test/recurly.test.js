import assert from 'assert';

describe('Recurly', () => {
  const Recurly = window.recurly.Recurly;
  let recurly;

  beforeEach(() => recurly = new Recurly());

  it('should have a version', () => {
    assert('string' === typeof recurly.version);
  });

  it('should be an event emitter', () => {
    assert(recurly.on && recurly.emit);
  });

  it('should be exposed as a global singleton', () => {
    assert(window.recurly instanceof Recurly);
  });

  describe('Recurly.request', () => {
    let cors = false;

    beforeEach(() => {
      recurly.configure({
        publicKey: 'test',
        api: '//' + window.location.host,
        cors: cors
      });
    });

    describe('when configured for jsonp requests', () => {
      it('invokes recurly.jsonp', () => {
        sinon.stub(recurly, 'jsonp');
        recurly.request('get', 'test', () => {});
        assert(recurly.jsonp.calledOnce);
      });
    });

    describe('when configured for cors requests', () => {
      before(() => cors = true);

      it('invokes recurly.xhr', () => {
        sinon.stub(recurly, 'xhr');
        recurly.request('get', 'test', () => {});
        assert(recurly.xhr.calledOnce);
      });
    });
  });
});
