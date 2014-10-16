var type   = require('type')
  , assert = require('component-assert');

describe('type', function(){
  it('should match objects', function(){
    function Foo(){}
    assert('object' === type({}));
    assert('object' === type(new Foo));
    assert('object' === type(new Boolean(true)));
    assert('object' === type(new Number(123)));
    // assert('object' === type(new String('whoop')));
  });

  it('should match numbers', function(){
    assert('number' === type(12));
  });

  it('should match strings', function(){
    assert('string' === type("test"));
  });

  it('should match dates', function(){
    assert('date' === type(new Date));
  });

  it('should match booleans', function(){
    assert('boolean' === type(true));
    assert('boolean' === type(false));
  });

  it('should match null', function(){
    assert('null' === type(null));
  });

  it('should match undefined', function(){
    assert('undefined' === type(undefined));
  });

  it('should match arrays', function(){
    assert('array' === type([]));
  });

  it('should match regexps', function(){
    assert('regexp' === type(/asdf/));
    assert('regexp' === type(new RegExp('weee')));
  });

  it('should match functions', function(){
    assert('function' === type(function(){}));
  });

  it('should match arguments', function(){
    assert('arguments' === type((function(){ return arguments })()));
  });

  it('should match elements', function(){
    assert('element' === type(document.createElement('div')));
  });
});