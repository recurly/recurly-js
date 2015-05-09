
var eql = require('..')

describe('Object strucures', function () {
  it('when structures match', function () {
    eql(
      { a : [ 2, 3 ], b : [ 4 ] },
      { a : [ 2, 3 ], b : [ 4 ] }
    ).should.be.true
  })

   it('when structures don\'t match', function () {
    eql(
      { x : 5, y : [6] },
      { x : 5, y : 6 }
    ).should.be.false
   })

   it('should handle nested nulls', function () {
    eql([ null, null, null ], [ null, null, null ]).should.be.true
    eql([ null, null, null ], [ null, 'null', null ]).should.be.false
   })

   it('should handle nested NaNs', function () {
    eql([ NaN, NaN, NaN ], [ NaN, NaN, NaN ]).should.be.true
    eql([ NaN, NaN, NaN ], [ NaN, 'NaN', NaN ]).should.be.false
   })

   it('custom equal methods', function(){
     eql({equal: function(){ return true }}, {}).should.be.true
     eql({equal: function(){ return false }}, {}).should.be.false
   })
})

describe('Comparing arguments', function () {
  var a = (function a(a,b,c) {return arguments}(1,2,3))
  var b = (function b(a,b,c) {return arguments}(1,2,3))
  var c = (function c(a,b,c) {return arguments}(2,2,3))

  it('should not consider the callee', function () {
    eql(a,b).should.be.true
    eql(a,c).should.be.false
  })

  it('should be comparable to an Array', function () {
    eql(a,[1,2,3]).should.be.true
    eql(a,[1,2,4]).should.be.false
    eql(a,[1,2]).should.be.false
  })

  it('should be comparable to an Object', function () {
    eql(a, {0:1,1:2,2:3,length:3}).should.be.true
    eql(a, {0:1,1:2,2:3,length:4}).should.be.false
    eql(a, {0:1,1:2,2:4,length:3}).should.be.false
    eql(a, {0:1,1:2,length:2}).should.be.false
  }).skip()
})

describe('Numbers', function () {
  it('should not coerce strings', function () {
    eql('1', 1).should.equal(false)
  })
  it('-0 should equal +0', function () {
    eql(-0, +0).should.be.true
  })
  describe('NaN', function () {
    it('should equal Nan', function () {
      eql(NaN, NaN).should.be.true
    })
    it('NaN should not equal undefined', function () {
      eql(NaN, undefined).should.be.false
    })
    it('NaN should not equal null', function () {
      eql(NaN, null).should.be.false
    })
    it('NaN should not equal empty string', function () {
      eql(NaN, '').should.be.false
    })
    it('should not equal zero', function () {
      eql(NaN, 0).should.be.false
    })
  })
})

describe('Strings', function () {
  it('should be case sensitive', function () {
    eql('hi', 'Hi').should.equal(false)
    eql('hi', 'hi').should.equal(true)
  })

  it('empty string should equal empty string', function () {
    eql('', "").should.be.true
  })
})

describe('undefined', function () {
  it('should equal only itself', function () {
    eql(undefined, null).should.be.false
    eql(undefined, '').should.be.false
    eql(undefined, 0).should.be.false
    eql(undefined, []).should.be.false
    eql(undefined, undefined).should.be.true
    eql(undefined, NaN).should.be.false
  })
})

describe('null', function () {
  it('should equal only itself', function () {
    eql(null, undefined).should.be.false
    eql(null, '').should.be.false
    eql(null, 0).should.be.false
    eql(null, []).should.be.false
    eql(null, null).should.be.true
    eql(null, NaN).should.be.false
  })
})

describe('Cyclic structures', function () {
  it('should not go into an infinite loop', function () {
    var a = {}
    var b = {}
    a.self = a
    b.self = b
    eql(a, b).should.equal(true)
  })
})

describe('functions', function () {
  it('should fail if they have different names', function () {
    eql(function a() {}, function b() {}).should.be.false
  })

  it('should pass if they are both anonamous', function () {
    eql(function () {}, function () {}).should.be.true
  })

  it('handle the case where they have different argument names', function () {
    eql(function (b) {return b}, function (a) {return a}).should.be.true
  }).skip()

  it('should compare them as objects', function () {
    var a = function () {}
    var b = function () {}
    a.title = 'sometitle'
    eql(a, b).should.be.false
  })

  it('should compare their prototypes', function () {
    var a = function () {}
    var b = function () {}
    a.prototype.a = 1
    eql(a,b).should.be.false
  })

  it('should be able to compare object methods', function () {
    eql(
      {noop: function () {}},
      {noop: function () {}}
    ).should.be.true
    eql(
      {noop: function (a) {}},
      {noop: function () {}}
    ).should.be.false
  })
})

describe('Buffer', function () {
  it('should compare on content', function () {
    eql(new Buffer('abc'), new Buffer('abc')).should.be.true
    eql(new Buffer('a'), new Buffer('b')).should.be.false
    eql(new Buffer('a'), new Buffer('ab')).should.be.false
  })

  it('should fail against anything other than a buffer', function () {
    eql(new Buffer('abc'), [97,98,99]).should.be.false
    eql(new Buffer('abc'), {0:97,1:98,2:99,length:3}).should.be.false
    eql([97,98,99], new Buffer('abc')).should.be.false
    eql({0:97,1:98,2:99,length:3}, new Buffer('abc')).should.be.false
  })
}).skip(typeof Buffer == 'undefined')

describe('possible regressions', function () {
  it('should handle objects with no constructor property', function () {
    var a = Object.create(null)
    eql(a, {}).should.be.true
    eql({}, a).should.be.true
    eql(a, {a:1}).should.be.false
    eql({a:1}, a).should.be.false
  })

  it('when comparing primitives to composites', function () {
    eql({}, undefined).should.be.false
    eql(undefined, {}).should.be.false

    eql(new String, {}).should.be.false
    eql({}, new String).should.be.false

    eql({}, new Number).should.be.false
    eql(new Number, {}).should.be.false

    eql(new Boolean, {}).should.be.false
    eql({}, new Boolean).should.be.false

    eql(new Date, {}).should.be.false
    eql({}, new Date).should.be.false

    eql(new RegExp, {}).should.be.false
    eql({}, new RegExp).should.be.false
  })
})
