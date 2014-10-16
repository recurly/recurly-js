
# find

  Find the first matching value in an array.

## Installation

    $ component install component/find

## API

### find(array, fn)

  Find with a function:

```js
var tobi = find(users, function(u){ return u.name == 'Tobi' });
```

### find(array, string)

  Find with property strings:

```js
find(users, 'admin');
```

### find(array, object)

  Find with object value matching:

```js
var users = [];
users.push({ name: 'Tobi', age: 2, species: 'ferret' });
users.push({ name: 'Jane', age: 6, species: 'ferret' });
users.push({ name: 'Luna', age: 2, species: 'cat' });

find(users, { name: 'Jane', age: 6 });
// => { name: 'Jane', age: 6, species: 'ferret' }

find(users, { name: 'Jane', age: 1 });
// => undefined
```

# License

  MIT
