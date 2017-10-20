import assert from 'assert';
import Recurly from '../lib/recurly';

const sinon = window.sinon;

describe('Recurly.Frame', function () {
  const path = '/relay';
  const originalOpen = window.open;
  const payload = { example: 'data' };
  const noop = () => {};

  beforeEach(function () {
    this.recurly = new Recurly;
    this.recurly.configure({
      publicKey: 'test',
      api: `//${window.location.host}/api`
    });
    window.open = sinon.spy();
    sinon.stub(window.document.body, 'appendChild').callsFake(relay => relay.onload());
  });

  afterEach(function () {
    window.open = originalOpen;
    window.document.body.appendChild.restore();
  });

  it('calls window.open', function () {
    let frame = this.recurly.Frame({ path });
    assert(window.open.calledOnce);
  });

  it('sends Recurly.version in the url', function () {
    this.recurly.Frame({ path });
    assert(window.open.calledWithMatch('version=' + recurly.version));
  });

  it('sends a listener event name to the opened url', function () {
    this.recurly.Frame({ path });
    assert(window.open.calledWithMatch(/recurly-frame-\w+-\w+/));
  });

  it('listens for the frame event', function () {
    let eventName;
    window.open = sinon.spy(function (url) {
      eventName = url.match(/(recurly-frame-\w+-\w+)/)[0];
    });
    let frame = this.recurly.Frame({ path });
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
        this.recurly.Frame({ path });
        assert(window.open.calledWithMatch(this.recurly.config.api + path));
      });
    });
  });

  describe('when given data', function () {
    it('encodes the data into the opener url', function () {
      this.recurly.Frame({ path, payload });
      assert(window.open.calledWithMatch('example=data'));
    });

    it('produces a valid composite querystring of given and additional data', function () {
      this.recurly.Frame({ path, payload });
      assert(window.open.calledWithMatch(function (url) {
        return (url.match(/\?/) || []).length;
      }));
    });
  });
});
