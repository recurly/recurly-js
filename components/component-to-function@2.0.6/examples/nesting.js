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

// multi-key

var query = _({
  name: {
    first: /^L/,
    last: 'Cat'
  }
});

console.log(users.filter(query));

// multi-level

var query = _({
  name: { last: 'Cat' },
  age: 3
});

console.log(users.filter(query));
