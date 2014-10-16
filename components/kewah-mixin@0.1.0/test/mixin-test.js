var assert = require('assert');
var mixin = require('../');

describe('mixin()', function() {
  it('should works', function() {
    var a = {
      foo: 'bar',
      toto: 'tata'
    };

    var b = {};

    mixin(b, a);

    assert(b.foo === 'bar');
    assert(b.toto === 'tata');
  });
});
