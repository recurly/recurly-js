const assert = require('assert');
const {
  assertIsARecurlyError,
  configureRecurly,
  createElement,
  init,
  CARDS,
  ELEMENT_TYPES
} = require('../support/helpers');

describe.skip('CardElement', async () => {
  beforeEach(init());
  beforeEach(async () => {
    await createElement(ELEMENT_TYPES.CardElement);
  });

  for (const [type, CARD] of Object.entries(CARDS)) {
    describe(`when entering a(n) ${type.toLowerCase()} card number`, () => {
      it(...displaysIcon(CARD));
      it.skip(...dispaysCvvIcon(CARD));
    });
  }

  describe('when configured not to render icons', () => {
    it.skip('does not display an icon', async () => {
      await switchToCardElement();
    });
  });
});

function displaysIcon ({ brand, number, iconTitle: expectedIconTitle }) {
  return [`displays the ${brand} icon`, async () => {
    await switchToCardElement();

    const input = await $('.recurly-hosted-field-input-number');
    await input.addValue(number);

    await browser.executeAsync(function (done) {
      setTimeout(function () { done(); }, 2000);
      var icon = document.querySelector('.recurly-hosted-field-icon');
      icon.addEventListener('animationend', function () {
        done();
      });
    });

    const iconTitle = await $('.recurly-hosted-field-icon-front title');
    const iconTitleValue = await iconTitle.getAttribute('textContent');

    assert(await iconTitle.isDisplayed());
    assert.strictEqual(iconTitleValue, expectedIconTitle);
  }];
}

function dispaysCvvIcon ({ brand, number, cvvIconTitle }) {
  return [`displays the ${brand} cvv icon when focused on the cvv input`, async () => {
    await switchToCardElement();

    const inputNumber = await $('.recurly-hosted-field-input-number');
    await inputNumber.addValue(number);
    await browser.keys(['Tab', 'Tab']);

    // Amex displays its cvv on the front
    if (brand === CARDS.AMEX.brand) {
      const iconTitle = await $('.recurly-hosted-field-icon-front title');
      const iconTitleValue = await iconTitle.getAttribute('textContent');

      assert(await iconTitle.isDisplayed());
      assert.strictEqual(iconTitleValue, cvvIconTitle);
    } else {
      const iconBack = await $('.recurly-hosted-field-icon-back');
      const iconBackTitle = await $('.recurly-hosted-field-icon-back title');
      const iconBackTitleValue = await iconBackTitle.getAttribute('textContent');

      assert(await iconBack.isDisplayed());
      assert.strictEqual(iconBackTitleValue, cvvIconTitle);
    }
  }];
}

async function switchToCardElement () {
  const frame = await $('.recurly-element-card iframe');
  await browser.switchToFrame(frame);
}
