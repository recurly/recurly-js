<p align="center">
  <img src="http://i.imgur.com/7s94rRK.png">
  <br>
  <img src="https://i.imgur.com/2APg6q6.gif">
</p>

[![build status][travis-image]][travis-url]
[![Browser test status][sauce-image]][sauce-url]
[![code quality][climate-image]][climate-url]

## Documentation

[Getting Started & API Documentation][docs]

## Examples

See our [Examples Repo][examples] for example client-side and server-side
implementations.

## Installation

```html
<script src="https://js.recurly.com/v4/recurly.js"></script>
```

**Important:** Please do not host recurly.js or bundle it using a package manager. In order to ensure you always run the most stable and secure version possible, you must load recurly.js from our CDN.

## Build
Development build server
```bash
make
```
Build to the file system
```bash
$ make build
```

If you are having issues with the build, try `make clean`.

## Test
```bash
$ make test
```

## License

[MIT][license]

[*aurea mediocritas*][aristotle]

[travis-url]: https://travis-ci.org/recurly/recurly-js/builds
[travis-image]: https://img.shields.io/travis/recurly/recurly-js/master.svg?style=flat-square
[climate-url]: https://codeclimate.com/github/recurly/recurly-js
[climate-image]: http://img.shields.io/codeclimate/github/recurly/recurly-js.svg?style=flat-square
[sauce-url]: https://saucelabs.com/u/recurly-js
[sauce-image]: https://badges.herokuapp.com/travis/recurly/recurly-js/sauce/recurly-js?logos=none

[docs]: https://docs.recurly.com/js
[examples]: https://github.com/recurly/recurly-js-examples
[component]: http://github.com/component/component
[license]: LICENSE.md
[aristotle]: https://en.wikipedia.org/wiki/Golden_mean_(philosophy)
