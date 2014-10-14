
var each = require('..');

describe('each(arr, fn)', function(){
  it('should iterate the values', function(){
    var vals = [];
    each([1,2,3], function(val){
      vals.push(val);
    });
    vals.should.eql([1,2,3]);
  })

  it('should pass the index', function(){
    var vals = [];
    each([1,2,3], function(val, i){
      vals.push(i);
    });
    vals.should.eql([0,1,2]);
  })

  describe('when passed a context', function(){
    it('should iterate in context', function(){
      var vals = [];
      each([1,2,3], function(val, i){
        this.push(val);
      }, vals);
      vals.should.eql([1,2,3]);
    })
  })
})

describe('each(obj, fn)', function(){
  it('should iterate key / value pairs', function(){
    var user = { name: 'Tobi', age: 2 };
    var vals = [];
    each(user, function(key, val){
      vals.push([key, val]);
    });
    vals.should.eql([['name', 'Tobi'], ['age', 2]]);
  })

  describe('when .length is present', function(){
    it('should iterate as if it were an array', function(){
      var arr = { length: 2, 0: 'foo', 1: 'bar' };
      var vals = [];
      each(arr, function(val, i){
        vals.push(val, i);
      });
      vals.should.eql(['foo', 0, 'bar', 1]);
    })
  })

  describe('when passed a context', function(){
    it('should iterate in context', function(){
      var user = { name: 'Tobi', age: 2 };
      var vals = [];
      each(user, function(key, val){
        this.push([key, val]);
      }, vals);
      vals.should.eql([['name', 'Tobi'], ['age', 2]]);
    })
  })
})

describe('each(str, fn)', function(){
  it('should iterate characters', function(){
    var vals = [];
    each('hey', function(c, i){
      vals.push(c, i);
    });
    vals.should.eql(['h', 0, 'e', 1, 'y', 2]);
  })

  describe('when passed a context', function(){
    it('should iterate in context', function(){
      var vals = [];
      each('hey', function(c, i){
        this.push(c, i);
      }, vals);
      vals.should.eql(['h', 0, 'e', 1, 'y', 2]);
    })
  })
})

describe('each(users, fn)', function(){
  it('should use toFunction', function(){
    var users = [{ name: 'john' }];
    each(users, '.name = "baz"');
    users[0].name.should.equal('baz');
  })
})
