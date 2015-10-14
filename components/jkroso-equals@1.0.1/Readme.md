
# equals

  compare values of any type for equility

## Installation

With your favorite package manager:

- [packin](//github.com/jkroso/packin): `packin add equals`
- [component](//github.com/component/component#installing-packages): `component install jkroso/equals`
- [npm](//npmjs.org/doc/cli/npm-install.html): `npm install equals`

then in your app:

```js
var equal = require('equals')
```

## API

### equal(a, b, [memos])

`equal` takes as many arguments as you like of any type you like and returns a boolean result. Primitive types are equal if they are `===`. While composite types, i.e. Objects and Arrays, are considered equal if they have both the same structure and each sub-value is also `equal`. Circular references in composite structures are supported.

Same structure:
```js
equal(
  { a : [ 2, 3 ], b : [ 4 ] },
  { a : [ 2, 3 ], b : [ 4 ] }
) // => true
```

Different Structure:
```js
equal(
  { x : 5, y : [6] },
  { x : 5}
) // => false
```

Same structure, different values:

```js
equal(
  { a: [ 1, 2 ], b : [ 4 ]},
  { a: [ 2, 3 ], b : [ 4 ]}
) // => false
```

Primitives:

```js
equal(new Date(0), new Date(1)) // => false
```

Some possible gotchas:
- `null` __is not__ equal to `undefined`.
- `NaN` __is__ equal to `NaN` (normally not the case).
- `-0` __is__ equal to `+0`.
- Strings will __not__ coerce to numbers.
- Non enumerable properties will not be checked. They can't be.
- `arguments.callee` is not considered when comparing arguments
