
var map = require('..');

var tobi = { name: { first: 'tobi' }, age: 2, role: { name: 'admin' } };
var loki = { name: { first: 'loki' }, age: 1 };
var jane = { name: { first: 'jane' }, age: 8 };

describe('map(arr, fn)', function(){
  it('should map values', function(){
    var arr = [1,2,3];
    arr = map(arr, function(n){ return n * 2 });
    arr.should.eql([2,4,6]);
  })

  it('should pass indexes', function(){
    var arr = [1,2,3];
    arr = map(arr, function(n, i){ return i });
    arr.should.eql([0, 1, 2]);
  })

  it('should support property strings', function(){
    var users = [tobi, loki, jane];
    var arr = map(users, 'age');
    arr.should.eql([2,1,8]);
  })

  it('should support nested property strings', function(){
    var users = [tobi, loki, jane];
    var arr = map(users, 'name.first');
    arr.should.eql(['tobi', 'loki', 'jane']);
  })

  it('should return undefined when the nested props do not exist', function(){
    var users = [tobi, loki, jane];
    var arr = map(users, 'role.name');
    arr.should.eql(['admin', undefined, undefined]);
  })
})