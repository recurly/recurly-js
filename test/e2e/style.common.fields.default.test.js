const assert = require('assert');
const {
  init,
  assertStyleIs,
  STYLE_DEFAULTS,
  SEL
} = require('./support/helpers');

const COMBINED_PROP = [
  ['font-family',           STYLE_DEFAULTS.COMBINED.fontFamily], 
  ['font-feature-settings', STYLE_DEFAULTS.COMMON.fontFeatureSettings],
  ['font-kerning',          STYLE_DEFAULTS.COMMON.fontKerning],
  ['font-size',             STYLE_DEFAULTS.COMMON.fontSize],
  ['font-stretch',          STYLE_DEFAULTS.COMMON.fontStretch],
  ['font-style',            STYLE_DEFAULTS.COMMON.fontStyle],
  ['font-variant',          STYLE_DEFAULTS.COMMON.fontVariant],
  ['font-weight',           STYLE_DEFAULTS.COMMON.fontWeight],
  ['letter-spacing',        STYLE_DEFAULTS.COMMON.letterSpacing],
  ['line-height',           STYLE_DEFAULTS.COMMON.lineHeight],
  ['text-align',            STYLE_DEFAULTS.COMMON.textAlign],
  ['text-decoration',       STYLE_DEFAULTS.COMBINED.textDecoration],
  ['text-rendering',        STYLE_DEFAULTS.COMMON.textRendering],
  ['text-shadow',           STYLE_DEFAULTS.COMMON.textShadow],
  ['text-transform',        STYLE_DEFAULTS.COMMON.textTransform]
]

const DISTINCT_PROP = [
  ['font-family',           STYLE_DEFAULTS.DISTINCT.fontFamily], 
  ['font-feature-settings', STYLE_DEFAULTS.COMMON.fontFeatureSettings],
  ['font-kerning',          STYLE_DEFAULTS.COMMON.fontKerning],
  ['font-size',             STYLE_DEFAULTS.COMMON.fontSize],
  ['font-stretch',          STYLE_DEFAULTS.COMMON.fontStretch],
  ['font-style',            STYLE_DEFAULTS.COMMON.fontStyle],
  ['font-variant',          STYLE_DEFAULTS.COMMON.fontVariant],
  ['font-weight',           STYLE_DEFAULTS.COMMON.fontWeight],
  ['letter-spacing',        STYLE_DEFAULTS.COMMON.letterSpacing],
  ['line-height',           STYLE_DEFAULTS.COMMON.lineHeight],
  ['text-align',            STYLE_DEFAULTS.COMMON.textAlign],
  ['text-decoration',       STYLE_DEFAULTS.DISTINCT.textDecoration],
  ['text-rendering',        STYLE_DEFAULTS.COMMON.textRendering],
  ['text-shadow',           STYLE_DEFAULTS.COMMON.textShadow],
  ['text-transform',        STYLE_DEFAULTS.COMMON.textTransform]
]

// Test all the style defaults properties for both combined and distinct fields
describe('Default common property style tests', async () => {
  describe('when testing hosted-fields-card fixture', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card' })); 

    it(`Test combined fields property defaults: ${COMBINED_PROP.map(p => p[0])}`, async function () {
      await browser.switchToFrame(0);
      const number = await $(SEL.number);
      const expiry = await $(SEL.expiry);
      const cvv = await $(SEL.cvv);
      for await (const [prop, defaultValue] of COMBINED_PROP) {
        await assertStyleIs(number, prop, defaultValue);
        await assertStyleIs(expiry, prop, defaultValue);
        await assertStyleIs(cvv, prop, defaultValue);
      };
    });
  });

  describe.only('when testing hosted-fields-card-distinct fixture', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));  

    it(`Test distinct fields property defaults ${DISTINCT_PROP.map(p => p[0])}`, async function () {
      await browser.switchToFrame(0);
      const input = await $('.recurly-hosted-field-input');
      for await (const type of ['number', 'month', 'year', 'cvv']) {
        for await (const [prop, defaultValue] of DISTINCT_PROP) {
            await browser.switchToFrame(null);
            const frame = await $(`.recurly-hosted-field-${type} iframe`);
            await browser.switchToFrame(frame);
            await assertStyleIs(input, prop, defaultValue);               
        };
      }
    });
  });
});