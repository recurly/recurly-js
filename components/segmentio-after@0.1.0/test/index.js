
describe('after', function () {

  var after = require('after');
  var assert = require('assert');

  it('should work', function () {
    var i = 0;
    var fn = after(3, function(){ return ++i; });
    assert(undefined === fn());
    assert(undefined === fn());
    assert(1 === fn());
    assert(2 === fn());
  });

});