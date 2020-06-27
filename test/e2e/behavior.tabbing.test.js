const assert = require('assert');
const {
  BROWSERS,
  createElement,
  DEVICES,
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

    if (environmentIs(DEVICES.IOS)) {
      // iOS requires that each iframe be interacted with before focus directives succeed
      const frames = await browser.$$('iframe');
      for (frame of frames) {
        await browser.switchToFrame(frame);
        await browser.switchToFrame(null);
      }
    }

    await browser.execute(function () {
      document.querySelector('[data-test=arbitrary-input-0]').focus();
    });
    assert(await firstInput.isFocused());

    if (environmentIs(DEVICES.IOS)) {
      const [appContext, webContext] = await driver.getContexts();
      await driver.switchContext(appContext);
      const next = await driver.$("//*[@label='Next']");

      while (!destinationReached) {
        await next.click();
        await driver.switchContext(webContext);
        destinationReached = await lastInput.isFocused();
        if (!destinationReached) await driver.switchContext(appContext);
      }
    } else if (environmentIs(DEVICES.ANDROID)) {
      const TAB_KEY = 61;
      while (!destinationReached) {
        await driver.pressKeyCode(TAB_KEY);
        destinationReached = await lastInput.isFocused();
      }
    } else {
      // Non-mobile is much simpler
      while (!destinationReached) {
        await browser.keys('Tab');
        destinationReached = await lastInput.isFocused();
      }
    }

    // IE11 cannot perform tab progression in reverse from within an <iframe>
    // Android devices do not support reverse tab progression
    if (environmentIs(BROWSERS.IE_11)) {
      return;
    }

    destinationReached = false;

    if (environmentIs(DEVICES.IOS)) {
      const [appContext, webContext] = await driver.getContexts();
      await driver.switchContext(appContext);
      const prev = await driver.$("//*[@label='Previous']");

      while (!destinationReached) {
        await prev.click();
        await driver.switchContext(webContext);
        destinationReached = await firstInput.isFocused();
        if (!destinationReached) await driver.switchContext(appContext);
      }
    } else if (environmentIs(DEVICES.ANDROID)) {
      const TAB_KEY = 61;
      while (!destinationReached) {
        await driver.pressKeyCode(TAB_KEY, 1);
        destinationReached = await lastInput.isFocused();
      }
    } else {
      while (!destinationReached) {
        await browser.keys(['Shift', 'Tab']);
        destinationReached = await firstInput.isFocused();
      }
    }
  }];
}
