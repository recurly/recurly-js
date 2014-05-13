[<img src="https://travis-ci.org/recurly/recurly-js.svg" alt="Travis" align="right">][travis]

![Recurly.js](http://docs.recurly.com/js/images/recurly-js-black.png "Recurly.js")

Simple subscription billing in the browser

## Documentation

[Recurly.js Documentation][docs]

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

[travis]: https://travis-ci.org/recurly/recurly-js/builds
[aristotle]: http://en.wikipedia.org/wiki/Golden_mean_(philosophy)
[docs]: https://docs.recurly.com/js
[component]: http://github.com/component/component
[license]: LICENSE.md
