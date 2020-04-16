const assert = require('assert');
const {
  init,
  assertIsAToken,
  styleHostedField,
  assertStyleIs,
  FIELD_TYPES,
  STYLE_DEFAULTS,
  SEL
} = require('./support/helpers');

describe('fontSize style tests', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card' }));

  it('when changing fields.all.style.fontSize', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);

    await assertStyleIs(number, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(expiry, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(cvv, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);

    // Change the fontSize
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.ALL, { fontSize: '1.25em' });

    // Assert the fontSize has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', '20px');
    await assertStyleIs(expiry, 'fontSize', '20px');
    await assertStyleIs(cvv, 'fontSize', '20px');

  });


  it('when changing fields.card.style.fontSize', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleIs(number, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(expiry, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(cvv, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);

    // Change the fontSize using
    await browser.switchToFrame(null);
    const result = await styleHostedField(FIELD_TYPES.CARD, { fontSize: '2em' });

    // Assert the fontSize has changed all the combined card field
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', '32px');
    await assertStyleIs(expiry, 'fontSize', '32px');
    await assertStyleIs(cvv, 'fontSize', '32px');
   });


   it('when changing fields.number.style.fontSize', async function () {
    // Assert the default is source sans pro
    await browser.switchToFrame(0);
    const number = await $(SEL.number);
    const expiry = await $(SEL.expiry);
    const cvv = await $(SEL.cvv);
    await assertStyleIs(number, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(expiry, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(cvv, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);

    // Change the fontSize
    await browser.switchToFrame(null);
    const result1 = await styleHostedField(FIELD_TYPES.NUMBER, { fontSize: '1.75em' });
    const result2 = await styleHostedField(FIELD_TYPES.MONTH, { fontSize: '1.75em' });
    const result3 = await styleHostedField(FIELD_TYPES.YEAR, { fontSize: '1.75em' });
    const result4 = await styleHostedField(FIELD_TYPES.CVV, { fontSize: '1.75em' });

    // Assert the fontSize should not changed for individual card fields
    await browser.switchToFrame(0);
    await assertStyleIs(number, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(expiry, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
    await assertStyleIs(cvv, 'fontSize', STYLE_DEFAULTS.COMMON.fontSize);
   });


});

