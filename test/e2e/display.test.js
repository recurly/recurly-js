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
        assertDiffThresholdMet(diff);
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
        assertDiffThresholdMet(diff);
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
      assertDiffThresholdMet(diff);
    });
  });

  describe('when using distinct card Hosted Fields', async function () {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct', opts: hostedFieldOpts }));

    it('matches distinct card Hosted Field baseline', async function () {
      if (environmentIs(BROWSERS.EDGE)) return this.skip();

      await fillDistinctCardElements();
      await clickFirstName();

      const diff =  await browser.checkFullPageScreen('hosted-fields/distinct-elements-pacifico');
      assertDiffThresholdMet(diff);
    });
  });
});

function assertDiffThresholdMet (diff) {
  let threshold;
  if (environmentIs(DEVICES.ANDROID)) {
    threshold = 0.5;
  } else if (environmentIs(DEVICES.IOS)) {
    threshold = 0.25;
  } else if (environmentIs(BROWSERS.EDGE)) {
    threshold = 0.05;
  }
  if (threshold) assert(diff <= threshold, `${diff} is above the threshold of ${threshold}`);
  else assert.strictEqual(diff, 0);
}

async function clickFirstName () {
  const firstName = await $(sel.firstName);
  await firstName.click();
}
