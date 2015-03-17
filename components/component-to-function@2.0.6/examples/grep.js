var _ = require('..');

var users = [
  'Tobi',
  'Loki',
  'Jane'
];

var t = users.filter(_(/^T/));

console.log(t);
