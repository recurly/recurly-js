
var _ = require('..');

var users = [
  { name: { first: 'Tobi' }},
  { name: { first: 'Loki' }},
  { name: { first: 'Jane' }},
  { name: { first: 'Manny' }}
];

var short = users.map(_('name.first'));
console.log(short);

