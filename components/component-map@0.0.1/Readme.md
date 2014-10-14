
# map

  Map utility

## Installation

    $ component install component/map

## API

### map(array, fn)

  Map returning a new array:

```js
var names = map(users, function(user){
  return user.name;
});
```

### map(array, string)

  Map properties in `string` returning a new array:

```js
var names = map(users, 'user.name');
var firstNames = map(users, 'user.name.first');
```

# License

  MIT
