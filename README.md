![Recurly.js](http://docs.recurly.com/js/images/recurly-js-black.png "Recurly.js")

Simple subscription billing in the browser

[![build status][travis-image]][travis-url]
[![code quality][climate-image]][climate-url]

## Documentation

[Getting Started & API Documentation][docs]

## Examples

See our [Examples Repo][examples] for example client-side and server-side
implementations.

## Installation

### Standard
```html
<script src="https://js.recurly.com/v3/recurly.js"></script>
```

### Component
**component.json**

```json
{
  "dependencies": {
    "recurly/recurly-js": "*"
  }
}
```
**index.html**

```html
<script>
  var recurly = require('recurly');
</script>
```

[Learn more about component][component]

## Build
```bash
$ make build
```

If you are having issues with the build, try `make clean`

## Test
```bash
$ make
```

## Beta Features

### XHR+CORS

As of v3.0.9, Recurly.js supports API communication using
Cross-Origin Resource Sharing over XMLHttpRequest, as opposed
to the traditional method of JSONP. A later version of Recurly.js will
switch over to using CORS+XHR exclusively, but if you would like to test
out this feature first, you may enable it by setting the `cors` configuration
property to `true`.

```js
recurly.configure({
  publicKey: 'YOUR PUBLIC KEY',
  cors: true
});
```

Please note that in order to use this feature in IE9, you must serve your
payment page over HTTPS. This is a known limitation in the CORS implementation
in IE9.

## License

[MIT][license]

[*aurea mediocritas*][aristotle]

[travis-url]: https://travis-ci.org/recurly/recurly-js/builds
[travis-image]: http://img.shields.io/travis/recurly/recurly-js.svg?style=flat
[climate-url]: https://codeclimate.com/github/recurly/recurly-js
[climate-image]: http://img.shields.io/codeclimate/github/recurly/recurly-js.svg?style=flat

[docs]: https://docs.recurly.com/js
[examples]: https://github.com/recurly/recurly-js-examples
[component]: http://github.com/component/component
[license]: LICENSE.md
[aristotle]: https://en.wikipedia.org/wiki/Golden_mean_(philosophy)
