/*global describe, it */
var expect = require('expect.js'),
    par = require('../');
describe('lpartial', function() {
    var lpartial = par.lpartial;
    function args2arr() {
        return Array.prototype.slice.call(arguments, 0);
    }
    it('can be called with only a function', function() {
        var fn = lpartial(args2arr);
        expect(fn(1, 2, 3)).to.eql(args2arr(1, 2, 3));
    });
    it('passes its arguments', function() {
        var fn = lpartial(args2arr, 1, 2, 3);
        expect(fn()).to.eql(args2arr(1, 2, 3));
    });
    it('prepends its arguments', function() {
        var fn = lpartial(args2arr, 1, 2);
        expect(fn(3, 4)).to.eql(args2arr(1, 2, 3, 4));
    });
    it('does not affect the context', function() {
        var obj = {
            value: 4,
            multiplyBy: function(x) {
                return this.value * x;
            }
        };
        obj.multiplyBy3 = lpartial(obj.multiplyBy, 3);
        expect(obj.multiplyBy3()).to.equal(obj.multiplyBy(3));
    });
});
