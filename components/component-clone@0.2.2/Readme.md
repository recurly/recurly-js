
# clone

  Object clone supporting `date`, `regexp`, `array` and `object` types.

## Example

```js
var obj = clone({
  a: 'b',
  c: [
    new Date(),
    'tobi',
    'jane'
  ]
})
```

## API

### clone(obj)

  Clones `obj` recursively and returns it.

## License

MIT
