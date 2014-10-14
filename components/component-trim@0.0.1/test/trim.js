
var trim = require('..');

describe('trim(str)', function(){
  it('should trim leading / trailing whitespace', function(){
    trim('  foo bar  ').should.equal('foo bar');
    trim('\n\n\nfoo bar\n\r\n\n').should.equal('foo bar');
  })
})

describe('.left(str)', function(){
  it('should trim leading whitespace', function(){
    trim.left('  foo bar  ').should.equal('foo bar  ');
  })
})

describe('.right(str)', function(){
  it('should trim trailing whitespace', function(){
    trim.right('  foo bar  ').should.equal('  foo bar');
  })
})
