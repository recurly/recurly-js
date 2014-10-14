
/* test dependencies */

var clone = require('..');
var expect = require('expect.js');

/* tests */

describe('clone', function(){

  it('date', function(){
    var obj = new Date;
    var cloned = clone(obj);
    expect(cloned.getTime()).to.be(obj.getTime());
    expect(cloned).not.to.be(obj);
  });

  it('regexp', function(){
    var obj = /hello/i;
    var cloned = clone(obj);
    expect(cloned.toString()).to.be(obj.toString());
    expect(cloned).not.to.be(obj);
  });

  it('array', function(){
    var obj = [1, 2, 3, '4'];
    var cloned = clone(obj);
    expect(cloned).to.eql(obj);
    expect(cloned).not.to.be(obj);
  });

  it('object', function(){
    var obj = {
      a: 1,
      b: 2,
      c: 3
    };
    var cloned = clone(obj);
    expect(cloned).to.eql(obj);
    expect(cloned).not.to.be(obj);
  });

  it('object combined', function(){
    var date = new Date;
    var obj = {
      a: {
        b: [1, 2, date, { hello: 'world' }]
      }
    };
    var cloned = clone(obj);
    expect(cloned).to.eql(obj);
    expect(cloned.a).not.to.be(obj.a);
    expect(cloned.a.b).not.to.be(obj.a.b);
    expect(cloned.a.b[2]).not.to.be(obj.a.b[2]);
    expect(cloned.a.b[2].getTime()).to.be(obj.a.b[2].getTime());
    expect(cloned.a.b[3]).to.eql(obj.a.b[3]);
    expect(cloned.a.b[3]).not.to.be(obj.a.b[3]);
  });

  it('object with functions', function() {
    var func   = function () { return 'original'; };
    var host   = { fluent: func };
    var cloned = clone(host);

    // cloned function matches original

    expect(cloned.fluent).to.be(func);

    // change cloned function (no longer matches original)

    cloned.fluent = function () { return 'updated'; };
    expect(cloned.fluent).not.to.be(func);
    expect(cloned.fluent()).to.be('updated');

    // original function is still in place

    expect(func()).to.be('original');
  });

});
