var assert = require('component/assert');
var each = require('component/each');
var noop = require('chrissrogers/noop');

describe('Recurly.open', function () {
  var Recurly = window.recurly.Recurly;
  var exampleUrl = 'http://recurly.com';
  var exampleData = { example: 'data' };
  var originalOpen = window.open;
  var recurly;

  beforeEach(function () {
    recurly = new Recurly;
    recurly.configure({
      publicKey: 'test',
      api: '//' + window.location.host
    });
    window.open = sinon.spy();
    sinon.stub(recurly, 'relay', function (done) {
      done();
    });
  });

  afterEach(function () {
    window.open = originalOpen;
    recurly.relay.restore();
  });

  it('requires Recurly.configure', function () {
    try {
      recurly.open(exampleUrl);
    } catch (e) {
      assert(~e.message.indexOf('Recurly.configure'));
    }
  });

  it('accepts a callback as either second or third parameter', function () {
    recurly.open(exampleUrl, noop);
    recurly.open(exampleUrl, {}, noop);
  });

  it('calls window.open', function () {
    recurly.open(exampleUrl, noop);
    assert(window.open.calledOnce);
  });

  it('sends Recurly.version in the url', function () {
    recurly.open(exampleUrl);
    assert(window.open.calledWithMatch('version=' + recurly.version));
  });

  it('sends a listener event name to the opened url', function () {
    recurly.open(exampleUrl);
    assert(window.open.calledWithMatch(/recurly-open-\d+/));
  });

  it('attaches an event listener to Recurly', function () {
    var eventName;
    window.open = sinon.spy(function (url) {
      eventName = url.match(/(recurly-open-\d+)/)[0];
    });
    recurly.open(exampleUrl);
    assert(recurly.hasListeners(eventName));
  });

  describe('when given a url with a protocol', function () {
    var examples = [
        'http://google.com'
      , 'https://google.com'
    ];

    it('opens that url', function () {
      each(examples, function (example) {
        recurly.open(example);
        assert(window.open.calledWithMatch(example));
      });
    });
  });

  describe('when given a url without a protocol', function () {
    var examples = [
        '/paypal/start'
      , 'google.com'
      , 'bfjbkdfs'
    ];

    it('opens the url relative to Recurly.config.api', function () {
      each(examples, function (example) {
        var expectation = recurly.config.api + example;
        recurly.open(example);
        assert(window.open.calledWithMatch(expectation));
      });
    });
  });

  describe('when given data', function () {
    it('encodes the data into the opener url', function () {
      recurly.open(exampleUrl, exampleData);
      assert(window.open.calledWithMatch('example=data'));
    });

    it('produces a valid composite querystring of given and additional data', function () {
      recurly.open(exampleUrl, exampleData);
      assert(window.open.calledWithMatch(function (url) {
        return (url.match(/\?/) || []).length;
      }));
    });
  });

  describe('when given a callback', function () {
    var callback = sinon.stub();

    it('is called when the event is emitted', function () {
      var eventName;
      window.open = sinon.spy(function (url) {
        eventName = url.match(/(recurly-open-\d+)/)[0];
      });
      recurly.open(exampleUrl, callback);
      recurly.emit(eventName, exampleData);
      assert(callback.calledOnce);
      assert(callback.calledWith(exampleData));
    });
  });
});
