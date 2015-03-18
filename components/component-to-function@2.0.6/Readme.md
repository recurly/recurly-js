# to-function

  Convert property access strings into functions

## Installation

    $ component install component/to-function

## Examples

```js
var toFunction = require('to-function');
var fn = toFunction('name.first');
var user = { name: { first: 'Tobi' }};
fn(user);
// => "Tobi"
```

### Dot access

```js

var _ = require('..');

var users = [
  { name: { first: 'Tobi' }},
  { name: { first: 'Loki' }},
  { name: { first: 'Jane' }},
  { name: { first: 'Manny' }}
];

var short = users.map(_('name.first'));
console.log(short);
// => [ 'Tobi', 'Loki', 'Jane', 'Manny' ]
```

### Equality

```js
var _ = require('..');

var tobi = { name: { first: 'Tobi' }, age: 2 };
var loki = { name: { first: 'Loki' }, age: 2 };
var jane = { name: { first: 'Jane' }, age: 6 };

var users = [tobi, loki, jane];

var user = users.filter(_(loki)).pop();
console.log(user);
// => { name: { first: 'Loki' }, age: 2 }
```

### Expressions

```js
var _ = require('..');

var users = [
  { name: { first: 'Tobi' }, age: 2 },
  { name: { first: 'Loki' }, age: 2 },
  { name: { first: 'Jane' }, age: 6 }
];

var oldPets = users.filter(_('age > 2 && age < 10'));
console.log(oldPets);
// => [ { name: { first: 'Jane' }, age: 6 } ]
```

### Regular expressions

```js
var _ = require('..');

var users = [
  'Tobi',
  'Loki',
  'Jane'
];

var t = users.filter(_(/^T/));

console.log(t);
// => [ 'Tobi' ]
```

### Nesting

```js
var _ = require('..');

var users = [
  { name: { first: 'Tobi', last: 'Ferret' }, age: 2 },
  { name: { first: 'Loki', last: 'Ferret' }, age: 2 },
  { name: { first: 'Luna', last: 'Cat' }, age: 2 },
  { name: { first: 'Manny', last: 'Cat' }, age: 3 }
];

// single-key

var query = _({
  name: {
    last: 'Cat'
  }
});

console.log(users.filter(query));
// => [ { name: { first: 'Luna', last: 'Cat' }, age: 2 },
//      { name: { first: 'Manny', last: 'Cat' }, age: 3 } ]

// multi-key

var query = _({
  name: {
    first: /^L/,
    last: 'Cat'
  }
});

console.log(users.filter(query));
// => [ { name: { first: 'Luna', last: 'Cat' }, age: 2 } ]

// multi-level

var query = _({
  name: { last: 'Cat' },
  age: 3
});

console.log(users.filter(query));
// => [ { name: { first: 'Manny', last: 'Cat' }, age: 3 } ]
```

## License

  MIT
