
# assert

  C-style assertion lib.

## Example

  With custom assertion message:

```js
var assert = require('assert');
assert(expr, 'oh no it broke');
```

  Or auto-generated assertion message in
  browsers that support `Error.captureStackTrace()`:

```js
var assert = require('assert');
assert(user.name == 'Tobi');
```

## License

  MIT