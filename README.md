<p align="center">
  <img src="http://i.imgur.com/7s94rRK.png">
  <br>
  <img src="https://i.imgur.com/768rLjE.gif">
</p>

[![build status][travis-image]][travis-url]
[![Browser test status][browserstack-image]][browserstack-url]
[![coverage][coverage-image]][coverage-url]

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

[climate-url]: https://codeclimate.com/github/recurly/recurly-js
[climate-image]: http://img.shields.io/codeclimate/github/recurly/recurly-js.svg?style=flat-square
[coverage-url]: https://coveralls.io/github/recurly/recurly-js
[coverage-image]: https://img.shields.io/coveralls/github/recurly/recurly-js.svg?style=flat-square
[browserstack-url]: https://automate.browserstack.com/public-build/MDJrZjliTlUvTjkzVGFzZ2ZpT1FHZ011aS9RUS9QQXE2ZlBZNUZJWWRGND0tLUcwbzUxYUF3QUt6dnM5aHJBb0lWNWc9PQ==--e8dfaeba4b9697fa5fc4ee5e245d44e5d9ad9d99%
[browserstack-image]: https://automate.browserstack.com/badge.svg?badge_key=MDJrZjliTlUvTjkzVGFzZ2ZpT1FHZ011aS9RUS9QQXE2ZlBZNUZJWWRGND0tLUcwbzUxYUF3QUt6dnM5aHJBb0lWNWc9PQ==--e8dfaeba4b9697fa5fc4ee5e245d44e5d9ad9d99%
[travis-url]: https://travis-ci.com/recurly/recurly-js/builds
[travis-image]: https://img.shields.io/travis/com/recurly/recurly-js/master.svg?style=flat-square

[docs]: https://developers.recurly.com/pages/recurly-js.html
[examples]: https://github.com/recurly/recurly-js-examples
[component]: http://github.com/component/component
[license]: LICENSE.md
[aristotle]: https://en.wikipedia.org/wiki/Golden_mean_(philosophy)
