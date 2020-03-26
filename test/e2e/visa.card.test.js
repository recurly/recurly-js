const assert = require('assert');
const {
  init,
  assertIsAToken,
  tokenize
} = require('./support/helpers');
const util = require('./support/util');
const sel = require('./support/form.elements');
const data = require('./support/data');
const cards = require('./support/credit.cards');

describe('VISA card validations', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('Test visa 4 4 4 4 format', async function () {
    const iframe = await $(sel.iframe);
    await (await $(sel.firstName)).setValue(data.firstName);
    await (await $(sel.lastName)).setValue(data.lastName);

    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)

    await number.setValue(cards.visa.number1)
    await expiry.setValue(cards.visa.expiry)
    await cvv.setValue(cards.visa.cvv)

    assert.strictEqual(await number.getValue(), cards.visa.number1)
    assert.strictEqual(await expiry.getValue(), cards.visa.expiry)
    assert.strictEqual(await cvv.getValue(), cards.visa.cvv)

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(sel.form);

    assert.strictEqual(err, null);
    assertIsAToken(token);

  });


  it('Test visa 4-4-4-4 format', async function () {
    const iframe = await $(sel.iframe);
    await (await $(sel.firstName)).setValue(data.firstName);
    await (await $(sel.lastName)).setValue(data.lastName);

    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)

    await number.setValue(cards.visa.number2)
    await expiry.setValue(cards.visa.expiry)
    await cvv.setValue(cards.visa.cvv)

    // The dashes should be removed
    assert.strictEqual(await number.getValue(), cards.visa.number1)
    assert.strictEqual(await expiry.getValue(), cards.visa.expiry)
    assert.strictEqual(await cvv.getValue(), cards.visa.cvv)

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(sel.form);

    assert.strictEqual(err, null);
    assertIsAToken(token);

  });

  it('Test visa non-numeric format', async function () {
    const iframe = await $(sel.iframe);
    await (await $(sel.firstName)).setValue(data.firstName);
    await (await $(sel.lastName)).setValue(data.lastName);

    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)

    await number.setValue('3711 443711 4X376')
    await expiry.setValue('1X28')
    await cvv.setValue('1W34')

    assert.strictEqual(await number.getValue(), '3711 443711 4376')
    assert.strictEqual(await expiry.getValue(), '12 / 8')
    assert.strictEqual(await cvv.getValue(), '134')

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(sel.form);

    assert.strictEqual(err.message, 'There was an error validating your request.');
    assert.strictEqual(token, null);

  });

});
