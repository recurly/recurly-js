const assert = require('assert');
const {
  createElement,
  getInputPlaceholderStyle,
  init,
  styleHostedField,
  ELEMENT_TYPES,
  FIELD_TYPES
} = require('./support/helpers');

const GRAY = 'rgb(163, 163, 167)';
const GREEN = 'green';
const ABSENT = '';
const CARD_DEFAULT_CONTENT = ['Card number', 'MM / YY', 'CVV'];

describe('Placeholder styling', async () => {
  describe('when using Elements', function () {
    beforeEach(init());

    describe('CardElement', function () {
      describe('by default', function () {
        beforeEach(async () => {
          await createElement(ELEMENT_TYPES.CardElement);
        });

        it(...hasPlaceholderColor(GRAY));
        it(...hasPlaceholderContent(CARD_DEFAULT_CONTENT));
      });

      describe('when a placeholder color is set', function () {
        beforeEach(async () => {
          const config = { style: { placeholder: { color: GREEN } } };
          await createElement(ELEMENT_TYPES.CardElement, config);
        });

        it(...hasPlaceholderColor(GREEN));
        it(...hasPlaceholderContent(CARD_DEFAULT_CONTENT));
      });
    });

    describe('distinct card Elements', function () {
      describe('by default', function () {
        beforeEach(async () => {
          await createElement(ELEMENT_TYPES.CardNumberElement);
          await createElement(ELEMENT_TYPES.CardMonthElement);
          await createElement(ELEMENT_TYPES.CardYearElement);
          await createElement(ELEMENT_TYPES.CardCvvElement);
        });

        it(...hasPlaceholderColor(ABSENT, 4));
        it(...hasPlaceholderContent([ABSENT]));
      });

      describe('when placeholder color is set', function () {
        beforeEach(async () => {
          const config = { style: { placeholder: { color: GREEN } } };
          await createElement(ELEMENT_TYPES.CardNumberElement, config);
          await createElement(ELEMENT_TYPES.CardMonthElement, config);
          await createElement(ELEMENT_TYPES.CardYearElement, config);
          await createElement(ELEMENT_TYPES.CardCvvElement, config);
        });

        it(...hasPlaceholderColor(GREEN, 4));
        it(...hasPlaceholderContent([ABSENT]));
      });
    });
  });

  describe('when using a Card Hosted Field', function () {
    beforeEach(init({ fixture: 'hosted-fields-card' }));

    describe('by default', function () {
      it(...hasPlaceholderColor(GRAY));
      it(...hasPlaceholderContent(CARD_DEFAULT_CONTENT));
    });

    describe('when a placeholder color is set', function () {
      beforeEach(async () => {
        await styleHostedField(FIELD_TYPES.CARD, { placeholder: { color: GREEN } });
      });

      it(...hasPlaceholderColor(GREEN));
      it(...hasPlaceholderContent(CARD_DEFAULT_CONTENT));
    });
  });

  describe('when using distinct card Hosted Fields', function () {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));

    describe('by default', function () {
      it(...hasPlaceholderColor(ABSENT, 4));
      it(...hasPlaceholderContent([ABSENT]));
    });

    describe('when placeholder color is set', function () {
      beforeEach(async () => {
        const config = { placeholder: { color: GREEN } };
        await styleHostedField(FIELD_TYPES.NUMBER, config);
        await styleHostedField(FIELD_TYPES.MONTH, config);
        await styleHostedField(FIELD_TYPES.YEAR, config);
        await styleHostedField(FIELD_TYPES.CVV, config);
      });

      it(...hasPlaceholderColor(GREEN));
      it(...hasPlaceholderContent([ABSENT]));
    });
  });
});

function hasPlaceholderColor (color, count = 1) {
  return [`is ${color || 'absent'}`, async () => {
    for (i = 0; i < count; i++) {
      await browser.switchToFrame(i);
      assert.strictEqual(await getInputPlaceholderStyle('color'), color);
      await browser.switchToFrame(null);
    }
  }];
}

function hasPlaceholderContent (contents) {
  return [`has placeholder(s) set to "${contents}"`, async () => {
    for (const frame of await browser.$$('iframe')) {
      await browser.switchToFrame(frame);
      const inputs = await browser.$$(`.recurly-hosted-field-input`);
      let i = 0;
      for (const content of contents) {
        const input = inputs[i++];
        assert.strictEqual(await input.getAttribute('placeholder'), content);
      }
      await browser.switchToFrame(null);
    }
  }];
}
