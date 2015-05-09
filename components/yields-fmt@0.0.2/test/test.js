
describe('fmt', function(){

  var assert = require('assert')
    , fmt = require('fmt');

  it('%d', function(){
    assert('number: 0' == fmt('number: %d', '0'));
  })

  it('%o', function(){
    assert('object: {}' == fmt('object: %o', {}));
  })

  it('%o', function(){
    assert('array: []' == fmt('array: %o', []));
  })

  it('%o', function(){
    assert('array: [{"a":"b"}]' == fmt('array: %o', [{ a: 'b' }]));
  })

  it('%d %s %o', function(){
    assert('0 string {}' == fmt('%d %s %o', '0number', 'string', {}))
  })

  it('extensible', function(){
    fmt.f = format;
    assert('floats: 1.00' == fmt('floats: 1.00', 1));

    function format(s){
      return Number(s || 0).toFixed(2);
    }
  })

})
