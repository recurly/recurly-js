# Recurly.js 3

Zen subscription billing in the browser

## Overview
This JavaScript library is included in a merchants form page and simplifies integration with
Recurly. When a user submits their credit card information, it is sent to the api.recurly.com and
a Recurly token is returned. This token is then sent to the merchant site, making it simple for
the merchant to be PCI compliant.

If a purchase is being made on the page, the payment is reserved on the credit credit card when
the token is generated. If there is a problem processing the payment, the error can be displayed
on the form page simplifying the user experience and error management required on the merchant
server.

3D Secure is transparently managed to the form developer by the RecurlyJS library and
api.recurly.com.

## API Documentation

[Recurly.js API Docs](https://docs.recurly.com/api/recurlyjs/v3beta)

## Installation

### Standard
```html
<script src="https://js.recurly.com/v3/recurly.js"></script>
```

### Component
**component.json**
```json
{
  "dependencies": {
    "recurly/recurly-js-v3": "*"
  }
}
```
**index.html**
```html
<script>
  var recurly = require('recurly');
</script>
```
[Learn more about component](http://github.com/component/component)

## Build
```bash
$ make
```

## Test
```bash
$ make test
```
