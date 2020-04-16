const assert = require('assert');
const {
  init,
  assertStyleColorIs,
  styleHostedField,
  FIELD_TYPES,
  STYLE_DEFAULTS,
  SEL
} = require('./support/helpers');

const cards = require('./support/credit.cards');


describe('fontColor style tests', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('when changing fields.card.style.fontColor', async function () {
    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleColorIs(number, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(expiry, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(cvv, STYLE_DEFAULTS.COMMON.fontColor);

    // Change the fontColor
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontColor: 'green' });

    // Assert the fontColor has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#008000');
    await assertStyleColorIs(expiry, '#008000');
    await assertStyleColorIs(cvv, '#008000');
  });

  it('when changing fields.number.style.fontColor', async function () {
    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleColorIs(number, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(expiry, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(cvv, STYLE_DEFAULTS.COMMON.fontColor);

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
  it('when invalid entries are entered', async function () {
    await browser.switchToFrame(0);
    const number = await $(SEL.number)
    const expiry = await $(SEL.expiry)
    const cvv = await $(SEL.cvv)

    await number.setValue(cards.visa.number1)
    await expiry.setValue(cards.visa.expiry)
    await cvv.setValue(cards.visa.cvv)

    // Expect the default color is black
    await assertStyleColorIs(number, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(expiry, STYLE_DEFAULTS.COMMON.fontColor);
    await assertStyleColorIs(cvv, STYLE_DEFAULTS.COMMON.fontColor);

    //Now enter all invalid entries and expected the font color changed to red
    await number.setValue('4111 1111 111A 1111')
    await expiry.setValue('124')
    await cvv.setValue('1X3')

    //Switch set the focus back to the main frame
    await browser.switchToFrame(null);
    await (await $(SEL.firstName)).addValue('');

    //Switch back to the iframe and hosted fields color should all be red
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#e35256');
    await assertStyleColorIs(expiry, '#e35256');
    await assertStyleColorIs(cvv, '#e35256');
  });

  // After set the invalid fontColor to yellow, the fontColor should not be the default red
  it('When changing invalid.fontColor', async function () {
    // Change the default invalid fontColor
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { invalid: {fontColor: 'yellow'} });

    await browser.switchToFrame(0);
    const number = await $(SEL.number)
    const expiry = await $(SEL.expiry)
    const cvv = await $(SEL.cvv)
    
    //Now enter all invalid entries
    await number.setValue('4111 1111 111A 1111')
    await expiry.setValue('124')
    await cvv.setValue('1X3')

    //Switch set the focus back to the main frame
    await browser.switchToFrame(null);
    await (await $(SEL.firstName)).addValue('');

    //Switch back to the iframe and the card fields font color should all be yellow
    await browser.switchToFrame(0);
    await assertStyleColorIs(number, '#ffff00');
    await assertStyleColorIs(expiry, '#ffff00');
    await assertStyleColorIs(cvv, '#ffff00');
  });

});
