
var bind = require('..');

describe('bind(obj, fn)', function(){
  it('should bind the function to the given object', function(){
    var tobi = { name: 'tobi' };

    function name() {
      return this.name;
    }

    var fn = bind(tobi, name);
    fn().should.equal('tobi');
  })
})

describe('bind(obj, fn, ...)', function(){
  it('should curry the remaining arguments', function(){
    function add(a, b) {
      return a + b;
    }

    bind(null, add)(1, 2).should.equal(3);
    bind(null, add, 1)(2).should.equal(3);
    bind(null, add, 1, 2)().should.equal(3);
  })

  it('should keep the arguments in order', function(){
    function add(a, b) {
      return a + b;
    }

    bind(null, add)('1', '2').should.equal('12');
    bind(null, add, '1')('2').should.equal('12');
    bind(null, add, '1', '2')().should.equal('12');
  })
})

describe('bind(obj, name)', function(){
  it('should bind the method of the given name', function(){
    var tobi = { name: 'tobi' };

    tobi.getName = function() {
      return this.name;
    };

    var fn = bind(tobi, 'getName');
    fn().should.equal('tobi');
  })
})
