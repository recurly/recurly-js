# Recurly.js 

Recurly.js is an open-source Javascript library for creating great looking credit card forms to securely create subscriptions, one-time transactions, and update billing information using Recurly. The library is designed to create fully customizable order forms while minimizing your PCI compliance scope.

This library depends on jQuery 1.5.2+.

Please refer to our full documentation at: http://docs.recurly.com/recurlyjs

## Building / Contributing

The build/ directory contains the compiled library. You might want to build it yourself if you are contributing or have an unusual use case that isn't appropriate for the official library.

* Install [node](http://nodejs.org/) and [npm](http://npmjs.org/)
* Run 'make'

Never edit build/recurly.js. The sources under src/ compile to build/recurly.js.

To create a new theme, just add a directory to 'themes' containing a recurly.css.
You can use any meta-language that compiles down to css and include that as well,
but the compiled .css should be under version control.
Put any images under 'images' and use relative paths in the css.
