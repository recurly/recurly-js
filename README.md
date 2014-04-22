# Recurly.js 3

Zen subscription billing in the browser

## Overview
This JavaScript library is included in a merchants form page and simplifies integration with
Recurly. When a user submits their credit card information, it is sent to the api.recurly.com and
a Recurly token is returned. You may then use this token to create subscriptions and update billing
information using the Recurly API, without ever having to handle a credit card number on your server, 
greatly simplifying PCI Compliance.

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
    "recurly/recurly-js": "*"
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
