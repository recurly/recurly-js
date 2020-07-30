const assert = require('assert');
const {
  BROWSERS,
  DEVICES,
  elementAndFieldSuite,
  environmentIs,
} = require('./support/helpers');

describe('Tabbing', elementAndFieldSuite(() => {
  it(...tabsThroughTheForm());
}));

function tabsThroughTheForm () {
  return ['tabs across the form', async () => {
    let destinationReached = false;
    const firstInput = await $('[data-test=arbitrary-input-0]');
    const lastInput = await $('[data-test=arbitrary-input-1]');

    if (environmentIs(DEVICES.IOS)) {
      // iOS requires that each iframe be interacted with before focus directives succeed
      const frames = await browser.$$('iframe');
      for (const frame of frames) {
        await browser.switchToFrame(frame);
        await browser.switchToFrame(null);
      }

      // This guarantees the presence of the software keyboard in iOS
      const [appContext, webContext] = await driver.getContexts();
      await driver.switchContext(appContext);
      const address = await driver.$("//*[@label='arbitrary-input-0']");
      await address.touchAction('tap');
      await driver.switchContext(webContext);
      await browser.pause(500);
    } else {
      await firstInput.click();
      await browser.execute(function () {
        document.querySelector('[data-test=arbitrary-input-0]').focus();
      });
    }

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
