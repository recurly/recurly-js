hosted field arch changes
======

## Problem

- In order to support reactive frameworks, we must move tokenization linkage from
  recurly.token <-> tokenization field
  to
  recurly.token <-> recurly.fields <-> tokenization field
- It is not possible to have multiple groups of fields

## Outstanding Issues

- How to resolve which field is the tokenization field when there are multiple
  - recurly.token(HTMLFormElement);
    - finds first tokenization field within the form
    - default to the HTMLFormElement of the first tokenization field, thus
      maintaining current behavior
- How to register groups of tokenization fields
  - Favored: Assume grouping by form
  - Alternatives
    - [data-recurly-field-group="1"] ?
    - recurly.Field.Card({ group: '1' }); ?

## Current Arch

1.

  recurly.configure({
    publicKey: 'abc-xyz',
    fields: {
      all: { ... },
      number: { ... },
      // etc ...
    }
  });

2. recurly instance creates single HostedFields instance
3. HostedFields creates HostedField instances from configuration object
4. subsequent calls to `configure` re-run steps 2 & 3

## New Arch

1.

  recurly.configure({ publicKey: 'abc-xyz' });

  var cardField = recurly.Field({ type: 'card' });

  // or ... ?

  var cardField = recurly.Field.Card({ selector: '[data-recurly=card]' });

2. recurly instance creates Fields instance: recurly.fields
3. recurly.Field.Card is a factory bound to recurly
  - when called, it instantiates a new field and registers it to recurly
  - recurly instance registers it to recurly.fields
  - recurly.fields will listen for tokenization call
    - if a tokenization field (number, card) is not present, it will trigger an error
    - if one is present, it will init tokenization to the tokenization field and forward replies

## Backward Compatibility

- Legacy calls to support
  - recurly.token(HTMLFormElement, (err, token) => {});
    - should require no changes
  - recurly.configure({ fields: ... });
    - configure will generate Field instances from the configuration object
