const assert = require('assert');
const {
  init,
  styleHostedField,
  assertStyleIs,
  FIELD_TYPES,
  STYLE_DEFAULTS,
  SEL
} = require('./support/helpers');

describe('fontFamily style tests', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('when changing fields.all.style.fontFamily', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);

    await assertStyleIs(number, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(expiry, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(cvv, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);

    // Change the fontFamily
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.ALL, { fontFamily: 'Helvetica' });

    // Assert the fontFamily has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'font-family', 'helvetica');
    await assertStyleIs(expiry, 'font-family', 'helvetica');
    await assertStyleIs(cvv, 'font-family', 'helvetica');

  });


  it('when changing fields.card.style.fontFamily', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleIs(number, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(expiry, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(cvv, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);

    // Change the fontFamily using
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontFamily: 'sans-serif' });

    // Assert the fontFamily has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'font-family', 'sans-serif');
    await assertStyleIs(expiry, 'font-family', 'sans-serif');
    await assertStyleIs(cvv, 'font-family', 'sans-serif');
   });


   it('when changing fields.number.style.fontFamily', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleIs(number, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(expiry, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);
    await assertStyleIs(cvv, 'font-family', STYLE_DEFAULTS.COMBINED.fontFamily);

    // Change the fontFamily
    await browser.switchToFrame(null);
    const result1 = await styleHostedField(FIELD_TYPES.NUMBER, { fontFamily: 'courier' });
    const result2 = await styleHostedField(FIELD_TYPES.MONTH, { fontFamily: 'courier' });
    const result3 = await styleHostedField(FIELD_TYPES.YEAR, { fontFamily: 'courier' });
    const result4 = await styleHostedField(FIELD_TYPES.CVV, { fontFamily: 'courier' });

    // Assert the fontFamily should not changed for individual card fields
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'font-family', 'source sans pro');
    await assertStyleIs(expiry, 'font-family', 'source sans pro');
    await assertStyleIs(cvv, 'font-family', 'source sans pro');
   });


});

