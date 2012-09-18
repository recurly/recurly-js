// Object.create polyfill; true prototypal programming
if (typeof Object.create !== 'function') {
 Object.create = function(o, props) {
  function F() {}
  F.prototype = o;

  if (typeof(props) === "object") {
   for (prop in props) {
    if (props.hasOwnProperty((prop))) {
     F[prop] = props[prop];
    }
   }
  }
  return new F();
 };
}

// Array.map
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        res[i] = fun.call(thisp, t[i], i, t);
    }

    return res;
  };
}

// Array.forEach
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function( callbackfn, thisArg ) {

    var T,
      O = Object(this),
      len = O.length >>> 0,
      k = 0;

    if ( !callbackfn || !callbackfn.call ) {
      throw new TypeError();
    }

    if ( thisArg ) {
      T = thisArg;
    }

    while( k < len ) {

      var Pk = String( k ),
        kPresent = O.hasOwnProperty( Pk ),
        kValue;

      if ( kPresent ) {
        kValue = O[ Pk ];

        callbackfn.call( T, kValue, k, O );
      }

      k++;
    }
  };
}
