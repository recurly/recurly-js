# Synopsis

**par** is a JavaScript implementation of partial function application (sometimes incorrectly called "currying").

[![stability 3 - stable](http://b.repl.ca/v1/stability-3_--_stable-yellowgreen.png)
](http://nodejs.org/api/documentation.html#documentation_stability_index) [![license - Unlicense](http://b.repl.ca/v1/license-Unlicense-lightgrey.png)](http://unlicense.org/)

[![browser support](https://ci.testling.com/pluma/par.png)](https://ci.testling.com/pluma/par)

[![Build Status](https://travis-ci.org/pluma/par.png?branch=master)](https://travis-ci.org/pluma/par) [![Coverage Status](https://coveralls.io/repos/pluma/par/badge.png?branch=master)](https://coveralls.io/r/pluma/par?branch=master) [![Dependencies](https://david-dm.org/pluma/par.png?theme=shields.io)](https://david-dm.org/pluma/par)

[![NPM status](https://nodei.co/npm/par.png?compact=true)](https://npmjs.org/package/par)

# How is this different from [`Function#bind`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind)?

The primary purpose of `Function#bind` is to create a closure to preserve a function's context (the `this` variable). Most implementations, including the one in ES 5, also allow partial function application.

The functions provided by `par` also create closures, but they pass their own context along. This means `Function#apply`, `Function#call` and method invocation syntax still behave as expected (with the context being set accordingly).

If you don't care about contexts (e.g. the function you want to wrap doesn't use `this`), `lpartial` and `Function#bind` can be used interchangeably.

There is no native equivalent of `rpartial`.

Another important distinction is that unlike `Function#bind`, `par` works in environments that don't support ECMAScript 5, such as legacy versions of Internet Explorer (versions 8 and lower) or Rhino (e.g. the version bundled with Sun JDK 1.6).

# Install

## Node.js

### With NPM

```sh
npm install par
```

### From source

```sh
git clone https://github.com/pluma/par.git
cd par
npm install
make && make dist
```

## Browser

### With component

```sh
component install pluma/par
```

[Learn more about component](https://github.com/component/component).

### With bower

```sh
bower install par
```

[Learn more about bower](https://github.com/twitter/bower).

### With a CommonJS module loader

Download the [latest minified CommonJS release](https://raw.github.com/pluma/par/master/dist/par.min.js) and add it to your project.

[Learn more about CommonJS modules](http://wiki.commonjs.org/wiki/Modules/1.1).

### With an AMD module loader

Download the [latest minified AMD release](https://raw.github.com/pluma/par/master/dist/par.amd.min.js) and add it to your project.

[Learn more about AMD modules](http://requirejs.org/docs/whyamd.html).

### As a standalone library

Download the [latest minified standalone release](https://raw.github.com/pluma/par/master/dist/par.globals.min.js) and add it to your project.

```html
<script src="/your/js/path/par.globals.min.js"></script>
```

This makes the `par` module available in the global namespace.

# Basic usage example

```javascript
var par = require('par');

function divideBy(x, y) {
    return x / y;
}

var divide4By = par(divideBy, 4);
console.log(divide4By(10)); // 0.4

var divideBy4 = par.rpartial(divideBy, 4);
console.log(divideBy4(10)); // 2.5
```

# Wrap-around example

```javascript
var par = require('par');

function say() {
    // This assumes a modern browser or recent version of IE
    console.log.apply(console, arguments);
}

say('I love Internet Explorer!'); // "I love Internet Explorer!"

var sarcastic = par.rpartial(par(say, '[sarcasm]'), '[/sarcasm]');

sarcastic('I love Internet Explorer!'); // "[sarcasm] I love Internet Explorer! [/sarcasm]"
```

# API

## par(fn, args…):Function

Creates a partially applied function that will append the initial arguments to the left-hand side of the argument list.

## par.rpartial(fn, args…):Function

Creates a partially applied function that will append the initial arguments to the right-hand side of the argument list.

## par.lpartial(fn, args…):Function

Alias for `par`.

# Unlicense

This is free and unencumbered public domain software. For more information, see http://unlicense.org/ or the accompanying [UNLICENSE](https://github.com/pluma/par/blob/master/UNLICENSE) file.

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/pluma/par/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

