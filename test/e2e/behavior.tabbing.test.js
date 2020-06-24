const assert = require('assert');
const {
  BROWSERS,
  createElement,
  environmentIs,
  ELEMENT_TYPES,
  FIELD_TYPES,
  init
} = require('./support/helpers');

describe('Tabbing', async () => {
  describe('when using Elements', function () {
    beforeEach(init());

    describe('CardElement', function () {
      beforeEach(async () => {
        await createElement(ELEMENT_TYPES.CardElement);
      });

      it(...tabsThroughTheForm());
    });

    describe('distinct card Elements', function () {
      beforeEach(async () => {
        await createElement(ELEMENT_TYPES.CardNumberElement);
        await createElement(ELEMENT_TYPES.CardMonthElement);
        await createElement(ELEMENT_TYPES.CardYearElement);
        await createElement(ELEMENT_TYPES.CardCvvElement);
      });

      it(...tabsThroughTheForm());
    });
  });

  describe('when using a Card Hosted Field', function () {
    beforeEach(init({ fixture: 'hosted-fields-card' }));

    it(...tabsThroughTheForm());
  });

  describe('when using distinct card Hosted Fields', function () {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));

    it(...tabsThroughTheForm());
  });
});

function tabsThroughTheForm () {
  return [`tabs across the form`, async () => {
    let destinationReached = false;
    const firstInput = await $('[data-test=arbitrary-input-0]');
    const lastInput = await $('[data-test=arbitrary-input-1]');

    await firstInput.click();
    assert(await firstInput.isFocused());

    while (!destinationReached) {
      await browser.keys('Tab');
      destinationReached = await lastInput.isFocused();
    }

    // IE11 cannot perform tab progression in reverse from within an <iframe>
    if (environmentIs(BROWSERS.IE_11)) {
      return;
    }

    destinationReached = false;
    while (!destinationReached) {
      await browser.keys(['Shift', 'Tab']);
      destinationReached = await firstInput.isFocused();
    }
  }];
}
