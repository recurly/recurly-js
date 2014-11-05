
# cors-xhr

  cors xhr

## Installation

  Install with [component(1)](http://component.io):

    $ component install yields/cors-xhr

## Example

uses `XMLHttpRequest` if there's `withCredentials` property or `XDomainRequest`.

```js
var XHR = require('cors-xhr');
if (!XHR) return; // not supported
var xhr = new XHR;
```

## License

  MIT
