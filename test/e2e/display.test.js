const assert = require('assert');
const {
  BROWSERS,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  environmentIs,
  fillCardElement,
  fillDistinctCardElements,
  init
} = require('./support/helpers');

const sel = {
  firstName: '[data-test="first-name"]'
};

const maybeDescribe = environmentIs(BROWSERS.ELECTRON) ? describe.skip : describe;

maybeDescribe('Display', () => {
  describe('when configured with Elements', async function () {
    beforeEach(init());

    describe('CardElement', async function () {
      it('matches CardElement baseline', async function () {
        await createElement(ELEMENT_TYPES.CardElement, { style: { fontFamily: 'Pacifico' }});
        await fillCardElement();
        await clickFirstName();

        const diff = await browser.checkFullPageScreen('elements/card-element-pacifico');
        if (environmentIs(DEVICES.ANDROID)) {
          assert(diff <= 0.5, `${diff} is above the threshold of 0.5`);
        } else if (environmentIs(BROWSERS.EDGE)) {
          assert(diff <= 0.05, `${diff} is above the threshold of 0.05`);
        } else if (environmentIs(DEVICES.IOS)) {
          assert(diff <= 0.01, `${diff} is above the threshold of 0.01`);
        } else {
          assert.strictEqual(diff, 0);
        }
      });
    });

    describe('distinct elements', async function () {
      it('matches distinct elements baseline', async function () {
        const { CardElement, ...distinctElements } = ELEMENT_TYPES;
        for (const element in distinctElements) {
          await createElement(element, { style: { fontFamily: 'Pacifico' }});
        }
        await fillDistinctCardElements();
        await clickFirstName();

        const diff = await browser.checkFullPageScreen('elements/distinct-elements-pacifico');
        if (environmentIs(DEVICES.ANDROID)) {
          assert(diff <= 0.5, `${diff} is above the threshold of 0.5`);
        } else if (environmentIs(BROWSERS.EDGE)) {
          assert(diff <= 0.05, `${diff} is above the threshold of 0.05`);
        } else if (environmentIs(DEVICES.IOS)) {
          assert(diff <= 0.01, `${diff} is above the threshold of 0.01`);
        } else {
          assert.strictEqual(diff, 0);
        }
      });
    });
  });

  const hostedFieldOpts = { fields: { all: { style: { fontFamily: 'Pacifico' } } } };

  describe('when using a card Hosted Field', async function () {
    beforeEach(init({ fixture: 'hosted-fields-card', opts: hostedFieldOpts }));

    it('matches card Hosted Field baseline', async function () {
      await fillCardElement();
      await clickFirstName();

      const diff = await browser.checkFullPageScreen('hosted-fields/card-element-pacifico');
      assert.strictEqual(diff, 0);
    });
  });

  describe('when using distinct card Hosted Fields', async function () {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct', opts: hostedFieldOpts }));

    it('matches distinct card Hosted Field baseline', async function () {
      if (environmentIs(BROWSERS.EDGE)) return this.skip();

      await fillDistinctCardElements();
      await clickFirstName();

      const diff =  await browser.checkFullPageScreen('hosted-fields/distinct-elements-pacifico');
      assert.strictEqual(diff, 0);
    });
  });
});

async function clickFirstName () {
  const firstName = await $(sel.firstName);
  await firstName.click();
}
