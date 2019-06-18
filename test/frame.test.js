import { applyFixtures } from './support/fixtures';
import assert from 'assert';
import { Recurly } from '../lib/recurly';
import { testBed } from './support/helpers';

const sinon = window.sinon;

describe('Recurly.Frame', function () {
  const path = '/relay';
  const originalOpen = window.open;
  const payload = { example: 'data' };
  const noop = () => {};

  beforeEach(function (done) {
    this.recurly = new Recurly;
    this.recurly.configure({
      publicKey: 'test',
      api: `//${window.location.host}/api`
    });
    this.newWindowSpy = sinon.stub({ close: () => {} });
    window.open = sinon.stub().returns(this.newWindowSpy);

    // HACK: when we're in an IE environment, we need to stub the relay creation;
    //       however, we want to proceed as normal in all other circumstances
    sinon.stub(window.document.body, 'appendChild').callsFake(function (maybeRelay) {
      if (~(maybeRelay.name || '').indexOf('recurly-relay-')) maybeRelay.onload();
      else this.appendChild.wrappedMethod.call(this, maybeRelay);
    });

    this.recurly.ready(done);
  });

  afterEach(function () {
    const { frame } = this;
    window.open = originalOpen;
    window.document.body.appendChild.restore();
    if (frame) frame.destroy();
  });

  applyFixtures();

  this.ctx.fixture = 'empty';

  it('calls window.open', function () {
    const frame = this.frame = this.recurly.Frame({ path });
    assert(window.open.calledOnce);
  });

  it('sends Recurly.version in the url', function () {
    this.frame = this.recurly.Frame({ path });
    assert(window.open.calledWithMatch(`version=${this.recurly.version}`));
  });

  it('sends a listener event name to the opened url', function () {
    this.frame = this.recurly.Frame({ path });
    assert(window.open.calledWithMatch(/recurly-frame-\w+-\w+/));
  });

  it('listens for the frame event', function () {
    let eventName;
    window.open = sinon.spy(function (url) {
      eventName = url.match(/(recurly-frame-\w+-\w+)/)[0];
    });
    const frame = this.frame = this.recurly.Frame({ path });
    assert(frame.hasListeners(eventName));
  });

  describe('when given a path', function () {
    const examples = [
      '/paypal/start',
      'google.com',
      'bfjbkdfs'
    ];

    it('opens the url relative to recurly.config.api', function () {
      examples.forEach(path => {
        const frame = this.recurly.Frame({ path });
        assert(window.open.calledWithMatch(this.recurly.config.api + path));
        frame.destroy();
      });
    });
  });

  describe('when given data', function () {
    it('encodes the data into the opener url', function () {
      this.frame = this.recurly.Frame({ path, payload });
      assert(window.open.calledWithMatch('example=data'));
    });

    it('produces a valid composite querystring of given and additional data', function () {
      this.frame = this.recurly.Frame({ path, payload });
      assert(window.open.calledWithMatch(function (url) {
        return (url.match(/\?/) || []).length;
      }));
    });
  });

  describe('Frame.destroy', function () {
    it('closes the window', function () {
      const frame = this.recurly.Frame({ path, payload });
      assert(this.newWindowSpy.close.notCalled);
      frame.destroy();
      assert(this.newWindowSpy.close.calledOnce);
    });
  });

  describe('when type=iframe', function () {
    it('requires a container', function () {
      assert.throws(() => {
        this.frame = this.recurly.Frame({ path, payload, type: 'iframe' });
      }, 'Invalid container. Expected HTMLElement, got undefined');
    });

    describe('when given a container', function () {
      beforeEach(function () {
        this.frame = this.recurly.Frame({ path, payload, type: 'iframe', container: testBed() });
      });

      it('injects an iframe into the container', function () {
        assert.strictEqual(testBed().children[0], this.frame.iframe);
      });

      it('sets the url appropriately', function () {
        assert(~this.frame.iframe.src.indexOf('/relay'));
        assert(~this.frame.iframe.src.indexOf('example=data'));
        assert(~this.frame.iframe.src.indexOf(`version=${this.recurly.version}`));
        assert(~this.frame.iframe.src.indexOf('event=recurly-frame-'));
        assert(~this.frame.iframe.src.indexOf('key=test'));
      });

      describe('Frame.destroy', function () {
        it('removes the iframe', function () {
          this.frame.destroy();
          assert.strictEqual(testBed().children[0], undefined);
          assert.strictEqual(this.frame.iframe, undefined);
        });
      });
    });
  });
});
