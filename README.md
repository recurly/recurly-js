![Recurly.js](http://docs.recurly.com/js/images/recurly-js-black.png "Recurly.js")

Simple subscription billing in the browser

[![build status][travis-image]][travis-url]

## Documentation

[Getting Started & API Documentation][docs]

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
[travis-image]: https://img.shields.io/travis/recurly/recurly-js.svg?style=flat

[docs]: https://docs.recurly.com/js
[component]: http://github.com/component/component
[license]: LICENSE.md
[aristotle]: http://en.wikipedia.org/wiki/Golden_mean_(philosophy)
