const assert = require('assert');
const {
  environment,
  init,
  assertIsAToken,
  tokenize
} = require('./support/helpers');

const sel = {
  output: '[data-test=output]',
  form: '[data-test=form]',
  submit: '[data-test=submit]',
  firstName: '[data-test="first-name"]',
  lastName: '[data-test="last-name"]',
  iframe: '.recurly-hosted-field iframe',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]'
};

describe('Recurly.js', async () => {
  beforeEach(init);

  it('injects a hosted field', async function () {
    const iframe = await $(sel.iframe);
    const url = await iframe.getAttribute('src');

    assert.strictEqual(url.substring(0, url.indexOf('#')), `${environment().api}/field.html`);
  });

  it('creates a token', async function () {
    const iframe = await $(sel.iframe);

    await (await $(sel.firstName)).setValue('John');
    await (await $(sel.lastName)).setValue('Rambo');

    await browser.switchToFrame(0);

    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);

    await number.setValue('4111111111111111');
    await expiry.setValue('1028');
    await cvv.setValue('123');

    assert.strictEqual(await number.getValue(), '4111 1111 1111 1111');
    assert.strictEqual(await expiry.getValue(), '10 / 28');
    assert.strictEqual(await cvv.getValue(), '123');

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(sel.form);

    assert.strictEqual(err, null);
    assertIsAToken(token);
  });
});
