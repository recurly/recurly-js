const assert = require('assert');
const {
  init,
  assertIsAToken,
  styleHostedField,
  assertStyleIs,
  FIELD_TYPES
} = require('./support/helpers');
const util = require('./support/util');
const sel = require('./support/form.elements');
const data = require('./support/data');
const cards = require('./support/credit.cards');

describe('Expiration date validations', async () => {
  beforeEach(init);

  it('Test fontFamily change for hosted field (fields.all.style.fontFamily)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);

    await assertStyleIs(number, 'font-family', data.default.fontFamily);
    await assertStyleIs(expiry, 'font-family', data.default.fontFamily);
    await assertStyleIs(cvv, 'font-family', data.default.fontFamily);

    // Change the fontFamily
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.ALL, { fontFamily: 'Helvetica' });

    // Assert the fontFamily has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'font-family', 'helvetica');
    await assertStyleIs(expiry, 'font-family', 'helvetica');
    await assertStyleIs(cvv, 'font-family', 'helvetica');

  });


  it('Test fontFamily change for combined fields (fields.card.style.fontFamily)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleIs(number, 'font-family', data.default.fontFamily);
    await assertStyleIs(expiry, 'font-family', data.default.fontFamily);
    await assertStyleIs(cvv, 'font-family', data.default.fontFamily);

    // Change the fontFamily using 
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontFamily: 'sans-serif' });

    // Assert the fontFamily has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'font-family', 'sans-serif');
    await assertStyleIs(expiry, 'font-family', 'sans-serif');
    await assertStyleIs(cvv, 'font-family', 'sans-serif');
   });


   it('Test fontFamily should not change for individual fields (fields.number.style.fontFamily)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleIs(number, 'font-family', data.default.fontFamily);
    await assertStyleIs(expiry, 'font-family', data.default.fontFamily);
    await assertStyleIs(cvv, 'font-family', data.default.fontFamily);

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

