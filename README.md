# Recurly.js v2

### :zap: Version 3 Available

Version 2 of Recurly.js has been deprecated in favor of version 3,
[available here](https://github.com/recurly/recurly-js). Version 2 will see
minimal mainenance updates, and we encourage all to switch to the new version.

## Introduction

Recurly.js is an open-source JavaScript library for creating great looking
credit card forms to securely create subscriptions, one-time transactions, and
update billing information using Recurly. The library is designed to create
fully customizable order forms while minimizing your PCI compliance scope.

This library depends on jQuery 1.5.2+.

Please refer to our full documentation at: http://docs.recurly.com/recurlyjs

## Building

The `build/` directory contains the compiled library. You might want to build it
yourself if you are contributing or have an unusual use case that isn't
appropriate for the official library.

* Install [node](http://nodejs.org/)
* Run `npm install`
* Run `make`

Never edit `build/recurly.js` or `build/recurly.min.js`. The files under `src/`
are compiled into `build/` so any changes will be overwritten.

To create a new theme, just add a directory to `themes` containing a
`recurly.css` file. You can use any meta-language that compiles down to CSS and
include that as well, but the compiled `.css` should be under version control.
Put any images under `images` and use relative paths in the CSS.

## Contributing

If you'd like to contribute changes back, please see the notes in the
[CONTRIBUTING.md](./CONTRIBUTING.md) file.
