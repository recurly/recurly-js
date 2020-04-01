const assert = require('assert');
const {
  init,
  assertStyleColorIs,
  assertIsAToken,
  styleHostedField,
  FIELD_TYPES
} = require('./support/helpers');
const sel = require('./support/form.elements');
const data = require('./support/data');
const cards = require('./support/credit.cards');

describe('Expiration date validations', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('Test fontColor change for card field (fields.card.style.fontColor)', async function () {
    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleColorIs(number, data.default.fontColor);
    await assertStyleColorIs(expiry, data.default.fontColor);
    await assertStyleColorIs(cvv, data.default.fontColor);

    // Change the fontColor
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontColor: 'green' });

    // Assert the fontColor has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#008000');
    await assertStyleColorIs(expiry, '#008000');
    await assertStyleColorIs(cvv, '#008000');
  });

  it('Test fontColor change for individual fields (fields.number.style.fontColor)', async function () {
    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleColorIs(number, data.default.fontColor);
    await assertStyleColorIs(expiry, data.default.fontColor);
    await assertStyleColorIs(cvv, data.default.fontColor);

    // Change the fontColor
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.NUMBER, { fontColor: 'blue' });

    // Assert the fontColor has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#545457');
    await assertStyleColorIs(expiry, '#545457');
    await assertStyleColorIs(cvv, '#545457');
   });

  // The font color should changed to red if an incorrect data was entered
  it('Test card fields should changed font color to default red', async function () {
    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)

    await number.setValue(cards.visa.number1)
    await expiry.setValue(cards.visa.expiry)
    await cvv.setValue(cards.visa.cvv)

    // Expect the default color is black
    await assertStyleColorIs(number, data.default.fontColor);
    await assertStyleColorIs(expiry, data.default.fontColor);
    await assertStyleColorIs(cvv, data.default.fontColor);

    //Now enter all invalid entries and expected the font color changed to red
    await number.setValue('4111 1111 111A 1111')
    await expiry.setValue('124')
    await cvv.setValue('1X3')

    //Switch set the focus back to the main frame
    await browser.switchToFrame(null);
    await (await $(sel.firstName)).addValue('');

    //Switch back to the iframe and hosted fields color should all be red
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#e35256');
    await assertStyleColorIs(expiry, '#e35256');
    await assertStyleColorIs(cvv, '#e35256');
  });

  // After set the invalid fontColor to yellow, the fontColor should not be the default red
  it('Test card fields should not changed font color to default red', async function () {
    // Change the default invalid fontColor
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { invalid: {fontColor: 'yellow'} });

    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)
    
    //Now enter all invalid entries
    await number.setValue('4111 1111 111A 1111')
    await expiry.setValue('124')
    await cvv.setValue('1X3')

    //Switch set the focus back to the main frame
    await browser.switchToFrame(null);
    await (await $(sel.firstName)).addValue('');

    //Switch back to the iframe and the card fields font color should all be yellow
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#ffff00');
    await assertStyleColorIs(expiry, '#ffff00');
    await assertStyleColorIs(cvv, '#ffff00');
  });

});
