const assert = require('assert');

const recurlyJsConfig = {
  publicKey: 'ewr1-zfJT5nPe1qW7jihI32LIRH'
};
const path = `e2e?config=${JSON.stringify(recurlyJsConfig)}`;

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

describe('Recurly.js', () => {
  it('injects a hosted field', async function () {
    await browser.url(path);

    const iframe = await $(sel.iframe);
    const url = await iframe.getAttribute('src');

    assert.strictEqual(url.substring(0, url.indexOf('#')), 'https://api.recurly.com/js/v1/field.html');
  });

  it('creates a token', async function () {
    await browser.url(path);

    const iframe = await $(sel.iframe);
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

    await browser.switchToParentFrame();

    await (await $(sel.firstName)).setValue('John');
    await (await $(sel.lastName)).setValue('Rambo');

    await (await $(sel.submit)).click();

    await browser.waitUntil(() => {
      return !!~$(sel.output).getText().indexOf('token received');
    }, 4000);
  });
})
