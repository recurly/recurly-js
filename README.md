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
$ make
```

## Test
```bash
$ make test
```

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
