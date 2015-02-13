var _ = require('..');

var users = [
  { name: 'Tobi' },
  { name: 'Loki' },
  { name: 'Jane' }
];

users = users.filter(_({ name: /^To/ }));

console.log(users);
