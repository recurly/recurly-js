
# fmt

  string format utility

## Installation

  Install with [component(1)](http://component.io):

    $ component install yields/fmt

## Example

```js
fmt('%d %s %o', '0n', 'str', {});
// => "0 str {}"

fmt.f = function(n){
  return Number(n || 0).toFixed(2);
};

fmt('floats: %f', 1);
// => "floats: 1.00"
```

## API

### fmt(str, ...)

  Format the given `str` with `...` args.

    - `%o`: JSON.stringify
    - `%d`: parseInt
    - `%s`: String

## License

  MIT
