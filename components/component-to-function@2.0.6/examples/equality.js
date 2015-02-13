var _ = require('..');

var tobi = { name: { first: 'Tobi' }, age: 2 };
var loki = { name: { first: 'Loki' }, age: 2 };
var jane = { name: { first: 'Jane' }, age: 6 };

var users = [tobi, loki, jane];

var user = users.filter(_(loki)).pop();
console.log(user);
