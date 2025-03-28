const assert = require('assert');
const {
  BROWSERS,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  environmentIs,
  fillCardElement,
  fillDistinctCardElements,
  fillCvvElement,
  init
} = require('./support/helpers');

const sel = {
  firstName: '[data-test="first-name"]'
};

describe('when configured with Elements', async function () {
  beforeEach(init());

  describe('CardElement', async function () {
    it('matches CardElement baseline', async function () {
      await createElement(ELEMENT_TYPES.CardElement, { style: { fontFamily: 'Pacifico' }});
      await fillCardElement();
      await clickFirstName();

      assertVisualRegressionThreshold(await browser.checkElement(await $('.test-bed'), 'elements/card-element'));
    });
  });

  describe('distinct elements', async function () {
    it('matches distinct elements baseline', async function () {
      const { CardElement, ...distinctElements } = ELEMENT_TYPES;
      for (const element in distinctElements) {
        await createElement(element, { style: { fontFamily: 'Pacifico' } });
      }
      await fillDistinctCardElements();
      await clickFirstName();

      assertVisualRegressionThreshold(await browser.checkElement(await $('.test-bed'), 'elements/distinct-elements'));
    });
  });
});

const hostedFieldOpts = { fields: { all: { style: { fontFamily: 'Pacifico' } } } };

describe('when using a card Hosted Field', async function () {
  beforeEach(init({ fixture: 'hosted-fields-card', opts: hostedFieldOpts }));

  it('matches card Hosted Field baseline', async function () {
    await fillCardElement();
    await clickFirstName();

    assertVisualRegressionThreshold(await browser.checkElement(await $('.test-bed'), 'hosted-fields/card-field'));
  });
});

describe('when using distinct card Hosted Fields', async function () {
  beforeEach(init({ fixture: 'hosted-fields-card-distinct', opts: hostedFieldOpts }));

  it('matches distinct card Hosted Field baseline', async function () {
    await fillDistinctCardElements();
    await clickFirstName();

    assertVisualRegressionThreshold(await browser.checkElement(await $('.test-bed'), 'hosted-fields/distinct-fields'));
  });
});

function assertVisualRegressionThreshold (diff, threshold = 0.05) {
  if (environmentIs(DEVICES.ANDROID) || environmentIs(BROWSERS.EDGE)) {
    threshold = 15;
  }

  assert(diff <= threshold, `${diff} is above the threshold of ${threshold}`);
}

async function clickFirstName () {
  const firstName = await $(sel.firstName);
  await firstName.click();
}
