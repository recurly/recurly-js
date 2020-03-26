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
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('Test fontSize change for hosted field (fields.all.style.fontSize)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);

    await assertStyleIs(number, 'fontSize', data.default.fontSize);
    await assertStyleIs(expiry, 'fontSize', data.default.fontSize);
    await assertStyleIs(cvv, 'fontSize', data.default.fontSize);

    // Change the fontSize
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.ALL, { fontSize: '1.25em' });

    // Assert the fontSize has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', '20px');
    await assertStyleIs(expiry, 'fontSize', '20px');
    await assertStyleIs(cvv, 'fontSize', '20px');

  });


  it('Test fontSize change for combined fields (fields.card.style.fontSize)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleIs(number, 'fontSize', data.default.fontSize);
    await assertStyleIs(expiry, 'fontSize', data.default.fontSize);
    await assertStyleIs(cvv, 'fontSize', data.default.fontSize);

    // Change the fontSize using
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontSize: '2em' });

    // Assert the fontSize has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', '32px');
    await assertStyleIs(expiry, 'fontSize', '32px');
    await assertStyleIs(cvv, 'fontSize', '32px');
   });


   it('Test fontSize should not change for individual fields (fields.number.style.fontSize)', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    await assertStyleIs(number, 'fontSize', data.default.fontSize);
    await assertStyleIs(expiry, 'fontSize', data.default.fontSize);
    await assertStyleIs(cvv, 'fontSize', data.default.fontSize);

    // Change the fontSize
    await browser.switchToFrame(null);
    const result1 = await styleHostedField(FIELD_TYPES.NUMBER, { fontSize: '1.75em' });
    const result2 = await styleHostedField(FIELD_TYPES.MONTH, { fontSize: '1.75em' });
    const result3 = await styleHostedField(FIELD_TYPES.YEAR, { fontSize: '1.75em' });
    const result4 = await styleHostedField(FIELD_TYPES.CVV, { fontSize: '1.75em' });

    // Assert the fontSize should not changed for individual card fields
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', data.default.fontSize);
    await assertStyleIs(expiry, 'fontSize', data.default.fontSize);
    await assertStyleIs(cvv, 'fontSize', data.default.fontSize);
   });


});

