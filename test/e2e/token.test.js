const assert = require('assert');
const {
  assertIsARecurlyError,
  assertIsAToken,
  configureRecurly,
  environment,
  init,
  tokenize
} = require('./support/helpers');

const sel = {
  form: '[data-test=form]',
  firstName: '[data-test="first-name"]',
  lastName: '[data-test="last-name"]',
};

const yearAt = add => ((new Date()).getFullYear() + add).toString().substring(2);

describe('tokenization', async () => {
  // TODO: complete
  // describe('when using a CardElement', tokenSuite({
  //   example: ['4111111111111111', `10${yearAt(1)}`, '123'],
  //   expectedTypes: ['card']
  // }));

  describe('when using a card hosted field', tokenSuite({
    fixture: 'hosted-fields-card',
    example: ['4111111111111111', `10${yearAt(1)}`, '123'],
    expectedTypes: ['card']
  }));

  describe('when using distinct hosted fields', tokenSuite({
    fixture: 'hosted-fields-card-distinct',
    example: ['4111111111111111', '10', yearAt(1), '123'],
    expectedTypes: ['number', 'month', 'year', 'cvv']
  }));
});

function tokenSuite ({ fixture, example, expectedTypes }) {
  return () => {
    beforeEach(init({ fixture }));

    it(...createsHostedFields(expectedTypes))
    it(...createsAToken(example));

    describe('when an invalid number is provided', () => {
      it(...returnsAValidationError(invalidNumber(example), { number: 'is invalid' }));
    });

    describe('when an invalid expiry is provided', () => {
      it(...returnsAValidationError(invalidExpiry(example), {
        month: 'is invalid',
        year: 'is invalid'
      }));
    });

    describe('when an invalid cvv is provided', () => {
      it(...returnsAValidationError(invalidCvv(example), { cvv: 'is invalid' }));
    });

    describe('when cvv is not provided', () => it(...createsAToken(withoutCvv(example))));
    describe('when cvv is required', () => {
      beforeEach(init({ fixture, opts: { required: ['cvv'] } }));

      describe('when a cvv is provided', () => it(...createsAToken(example)));
      describe('when a cvv is not provided', () => {
        it(...returnsAValidationError(withoutCvv(example), { cvv: "can't be blank" }));
      });
    });
  };
}

function invalidNumber (example) {
  const newExample = [...example];
  newExample[0] = '4111111111111112';
  return newExample;
}

function invalidExpiry (example) {
  const newExample = [...example];
  newExample.splice(-2, 1, example[example.length - 2].replace(yearAt(1), yearAt(-1)));
  return newExample;
}

function invalidCvv (example) {
  const newExample = [...example];
  newExample.splice(-1, 1, '1');
  return newExample;
}

function withoutCvv (example) {
  const newExample = [...example];
  newExample.splice(-1, 1, '');
  return newExample;
}

function createsHostedFields (types = []) {
  return [`creates hosted fields for ${types}`, async function () {
    const frames = await $$('.recurly-hosted-field iframe');
    assert.strictEqual(frames.length, types.length);
    let i = 0;
    for (const frame of frames) {
      const url = await frame.getAttribute('src');
      await browser.switchToFrame(frame);
      const type = await browser.execute(function () { return recurlyHostedField.type; });
      assert.strictEqual(url.substring(0, url.indexOf('#')), `${environment().api}/field.html`);
      assert.strictEqual(type, types[i++])
      await browser.switchToFrame(null);
    }
  }]
}

function createsAToken (examples) {
  return ['creates a token', async () => {
    const [err, token] = await fillAndTokenize(examples);
    assert.strictEqual(err, null);
    assertIsAToken(token);
  }];
}

function returnsAValidationError (examples, expectedErrors) {
  return ['returns an error', async () => {
    const [err, token] = await fillAndTokenize(examples);
    assert.strictEqual(token, null);
    assertIsARecurlyError(err, {
      code: 'validation',
      message: 'There was an error validating your request.',
      fields: Object.keys(expectedErrors),
      details: Object.entries(expectedErrors).map(([k, v]) => ({ field: k, messages: [v] }))
    });
  }];
}

async function fillAndTokenize (examples) {
  await (await $(sel.firstName)).setValue('John');
  await (await $(sel.lastName)).setValue('Rambo');

  let i = 0;
  for (const frame of await $$('iframe')) {
    await browser.switchToFrame(frame);
    for (const input of await $$('.recurly-hosted-field-input')) {
      await input.setValue(examples[i++]);
    }
    await browser.switchToFrame(null);
  }

  return await tokenize(sel.form);
}
