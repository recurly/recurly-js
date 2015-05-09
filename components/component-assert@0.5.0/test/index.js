
var assert = require('assert')
var equals = require('equals');

describe('assert', function(){
  it('should pass', function(){
    try {
      assert(true);
    } catch (e) {
      throw new Error('fail');
    }
  });

  it('should fail', function(){
    try {
      assert(false);
      throw new Error('fail');
    } catch (e) {
      if ('fail' == e.message) throw e;
    }
  });

  it('should supply a default message', function(){
    try {
      assert(0 + 0);
      throw new Error('fail');
    } catch (e) {
      if ('fail' == e.message) throw e;
      if ('0 + 0' != e.message) throw new Error('fail');
    }
  });

  it('should respect a custom message', function(){
    try {
      assert(false, 'message');
      throw new Error('fail');
    } catch (e) {
      if ('fail' == e.message) throw e;
      if ('message' != e.message) throw new Error('fail');
    }
  });

  describe('.equal', function(){
    it('should pass', function(){
      assert.equal(true, true);
    });

    it('should fail', function(){
      try {
        assert.equal({}, {});
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.equal(1, 42);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected 1 to equal 42.' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.equal(1, 42, 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.notEqual', function(){
    it('should pass', function(){
      try {
        assert.notEqual({}, {});
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.notEqual(true, true);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.notEqual(true, true);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected true not to equal true.' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.notEqual(true, true, 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.deepEqual', function(){
    it('should pass', function(){
      try {
        assert.deepEqual(['a', 'b'], ['a', 'b']);
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.deepEqual(['a', 'b'], [1, 2]);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.deepEqual(['a', 'b'], [1, 2]);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected ["a","b"] to deeply equal [1,2].' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.deepEqual(['a', 'b'], [1, 2], 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.notDeepEqual', function(){
    it('should pass', function(){
      try {
        assert.notDeepEqual(['a', 'b'], [1, 2]);
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.notDeepEqual(['a', 'b'], ['a', 'b']);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.notDeepEqual(['a', 'b'], ['a', 'b']);
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected ["a","b"] not to deeply equal ["a","b"].' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.notDeepEqual(['a', 'b'], ['a', 'b'], 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.strictEqual', function(){
    it('should pass', function(){
      try {
        assert.strictEqual('1', '1');
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.strictEqual(1, '1');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.strictEqual(1, '1');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected 1 to strictly equal "1".' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.strictEqual(1, '1', 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.notStrictEqual', function(){
    it('should pass', function(){
      try {
        assert.notStrictEqual(1, '1');
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        var err = assert.notStrictEqual('1', '1');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        var err = assert.notStrictEqual('1', '1');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected "1" not to strictly equal "1".' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        var err = assert.notStrictEqual('1', '1', 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.throws', function(){
    it('should pass', function(){
      try {
        assert.throws(function(){ throw new Error; });
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.throws(function(){});
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.throws(function(){});
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected function (){} to throw an error.' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.throws(function(){}, Error, 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });

  describe('.doesNotThrow', function(){
    it('should pass', function(){
      try {
        assert.doesNotThrow(function(){});
      } catch (e) {
        throw new Error('fail');
      }
    });

    it('should fail', function(){
      try {
        assert.doesNotThrow(function(){ throw new Error; });
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
      }
    });

    it('should supply a default message', function(){
      try {
        assert.doesNotThrow(function(){ throw new Error; });
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('Expected function (){ throw new Error; } not to throw an error.' != e.message) throw new Error('fail');
      }
    });

    it('should respect a custom message', function(){
      try {
        assert.doesNotThrow(function(){ throw new Error; }, Error, 'message');
        throw new Error('fail');
      } catch (e) {
        if ('fail' == e.message) throw e;
        if ('message' != e.message) throw new Error('fail');
      }
    });
  });
});
