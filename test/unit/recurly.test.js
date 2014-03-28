
var assert = require('assert');

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
});
