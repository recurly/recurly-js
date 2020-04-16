const assert = require('assert');
const {
  init,
  assertIsAToken,
  tokenize,
  SEL,
  NAME
} = require('./support/helpers');

const cards = require('./support/credit.cards');

describe('AMEX card validations', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('Test amex 4 6 5 format', async function () {
    const iframe = await $(SEL.iframe);
    await (await $(SEL.firstName)).setValue(NAME.firstName);
    await (await $(SEL.lastName)).setValue(NAME.lastName);

    await browser.switchToFrame(0);
    const number = await $(SEL.number)
    const expiry = await $(SEL.expiry)
    const cvv = await $(SEL.cvv)

    await number.setValue(cards.amex.number1)
    await expiry.setValue(cards.amex.expiry)
    await cvv.setValue(cards.amex.cvv)

    assert.strictEqual(await number.getValue(), cards.amex.number1)
    assert.strictEqual(await expiry.getValue(), cards.amex.expiry)
    assert.strictEqual(await cvv.getValue(), cards.amex.cvv)


    await browser.switchToFrame(null);
    const [err, token] = await tokenize(SEL.form);

    assert.strictEqual(err, null);
    assertIsAToken(token);

  });


  it('Test amex 4-6-5 format', async function () {
    const iframe = await $(SEL.iframe);
    await (await $(SEL.firstName)).setValue(NAME.firstName);
    await (await $(SEL.lastName)).setValue(NAME.lastName);

    await browser.switchToFrame(0);
    const number = await $(SEL.number)
    const expiry = await $(SEL.expiry)
    const cvv = await $(SEL.cvv)

    await number.setValue(cards.amex.number2)
    await expiry.setValue(cards.amex.expiry)
    await cvv.setValue(cards.amex.cvv)

    // The dashes should be removed
    assert.strictEqual(await number.getValue(), cards.amex.number1)
    assert.strictEqual(await expiry.getValue(), cards.amex.expiry)
    assert.strictEqual(await cvv.getValue(), cards.amex.cvv)

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(SEL.form);

    assert.strictEqual(err, null);
    assertIsAToken(token);

  });

  it('Test amex non-numeric format', async function () {
    const iframe = await $(SEL.iframe);
    await (await $(SEL.firstName)).setValue(NAME.firstName);
    await (await $(SEL.lastName)).setValue(NAME.lastName);

    await browser.switchToFrame(0);
    const number = await $(SEL.number)
    const expiry = await $(SEL.expiry)
    const cvv = await $(SEL.cvv)

    await number.setValue('3711 443711 4X376')
    await expiry.setValue('1X28')
    await cvv.setValue('1W34')

    assert.strictEqual(await number.getValue(), '3711 443711 4376')
    assert.strictEqual(await expiry.getValue(), '12 / 8')
    assert.strictEqual(await cvv.getValue(), '134')

    await browser.switchToFrame(null);
    const [err, token] = await tokenize(SEL.form);

    assert.strictEqual(err.message, 'There was an error validating your request.');
    assert.strictEqual(token, null);

  });

})
