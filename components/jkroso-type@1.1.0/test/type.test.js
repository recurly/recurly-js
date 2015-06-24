
var assert = require('assert/index')
var type = require('..')

describe('type', function(){
  it('should match objects', function(){
    function Foo(){}
    assert('object' === type({}))
    assert('object' === type(new Foo))
  })

  it('should match numbers', function(){
    assert('number' === type(12))
    assert('number' === type(new Number(12)))
  })

  it('should match strings', function(){
    assert('string' === type("test"))
    assert('string' === type(new String('whoop')))
  })

  it('should match dates', function(){
    assert('date' === type(new Date))
  })

  it('should match booleans', function(){
    assert('boolean' === type(true))
    assert('boolean' === type(false))
    assert('boolean' === type(new Boolean(false)))
  })

  it('should match null', function(){
    assert('null' === type(null))
  })

  it('should match undefined', function(){
    assert('undefined' === type(undefined))
  })

  it('should match arrays', function(){
    assert('array' === type([]))
  })

  it('should match regexps', function(){
    assert('regexp' === type(/asdf/))
    assert('regexp' === type(new RegExp('weee')))
  })

  it('should match functions', function(){
    assert('function' === type(function(){}))
  })

  it('should match arguments', function(){
    assert('arguments' === type((function(){ return arguments })()))
  })

  it('should match typed arrays', function () {
    assert('bit-array' === type(new Uint8Array))
    assert('bit-array' === type(new Uint16Array))
    assert('bit-array' === type(new Uint32Array))
  })

  it('should match errors', function(){
    assert('error' === type(new Error))
    assert('error' === type(new TypeError))
    assert('error' === type(new RangeError))
    assert('error' === type(new SyntaxError))
  })

  if (typeof window != 'undefined') describe('in browsers', function(){
    it('should match elements', function(){
      assert('element' === type(document.createElement('div')))
    })

    it('should match textnodes', function(){
      assert('text-node' === type(document.createTextNode('div')))
    })

    if (typeof FormData == 'function') it('should match from data', function(){
      assert('form-data' === type(new FormData))
    })

    if (typeof File == 'function') it.skip('should match files', function(){
      assert('file' === type(new File)) // TODO: fix test
    })

    if (typeof Blob == 'function') it('should match blobs', function(){
      assert('blob' === type(new Blob))
    })
  })
})
