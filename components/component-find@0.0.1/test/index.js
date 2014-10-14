
var find = require('..')
  , assert = require('assert');

var users = [];

users.push({ name: 'Tobi', age: 2, species: 'ferret', admin: true })
users.push({ name: 'Jane', age: 6, species: 'ferret' })
users.push({ name: 'Luna', age: 2, species: 'cat', awesome: { cat: true }})

describe('find(arr, fn)', function(){
  it('should return the first truthy value', function(){
    var ret = find(users, function(u){ return u.name == 'Jane' });
    ret.should.equal(users[1]);
  })
})

describe('find(arr, str)', function(){
  it('should return with truthy property', function(){
    var ret = find(users, 'admin');
    ret.should.equal(users[0]);

    var ret = find(users, 'awesome.cat');
    ret.should.equal(users[2]);
  })
})

describe('find(arr, obj)', function(){
  describe('with one property', function(){
    it('should find object with matching property', function(){
      var ret = find(users, { name: 'Jane' });
      ret.should.equal(users[1]);

      var ret = find(users, { name: 'Bob' });
      assert(null == ret);
    })
  })

  describe('with multiple properties', function(){
    it('should find object matching properties', function(){
      var ret = find(users, { name: 'Jane', age: 6 });
      ret.should.equal(users[1]);

      var ret = find(users, { name: 'Jane', age: 2 });
      assert(null == ret);
    })
  })
})