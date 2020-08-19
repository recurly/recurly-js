const assert = require('assert');
const {
  init,
  ELEMENT_TYPES,
  createElement,
} = require('./support/helpers');

const {
  BROWSER,
} = process.env;


const sel = {
  hostedFieldInput: '.recurly-hosted-field-input',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]'
};

if (BROWSER !== 'Electron') {
  describe('Display', function () {
    describe('when configured with elements', async function () {
      beforeEach(init());

      describe('CardElement', async function () {
        it('matches CardElement baseline', async function () {
          await createElement(ELEMENT_TYPES.CardElement, { style: { fontFamily: 'Pacifico' }});
          await enterCardValues();
          await clickBody();

          const diff = await browser.checkFullPageScreen('elements/card-element-pacifico');
          if (BROWSER.includes('BrowserStackIos')) {
            assert(diff <= 0.01);
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
          await enterDistinctFieldValues();
          await clickBody();

          const diff = await browser.checkFullPageScreen('elements/distinct-elements-pacifico');
          if (BROWSER.includes('BrowserStackIos')) {
            assert(diff <= 0.01);
          } else {
            assert.strictEqual(diff, 0);
          }
        });
      });
    });

    describe('when configured with fields', async function () {
      const config = { fields: { all: { style: { fontFamily: "Pacifico" } } } };

      describe('CardElement', async function () {
        beforeEach(init({ fixture: 'hosted-fields-card', opts: config }));

        it('matches CardElement baseline', async function () {
          await enterCardValues();
          await browser.switchToFrame(null);
          await clickBody();

          const diff = await browser.checkFullPageScreen('hosted-fields/card-element-pacifico');
          assert.strictEqual(diff, 0);
        });
      });

      if (BROWSER !== 'BrowserStackEdge') {
        describe("distinct elements", async function () {
          beforeEach(init({ fixture: 'hosted-fields-card-distinct', opts: config }));

          it('matches distinct elements baseline', async function () {
            await enterDistinctFieldValues();
            await browser.switchToFrame(null);
            await clickBody();

            const diff =  await browser.checkFullPageScreen('hosted-fields/distinct-elements-pacifico');
            assert.strictEqual(diff, 0);
          });
        });
      }
    });
  });
}

  async function clickBody() {
    const body = await $("body");
    await body.click();
  }

  async function enterCardValues() {
    await browser.switchToFrame(0);

    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);

    await number.setValue('4111111111111111');
    await expiry.setValue('1028');
    await cvv.setValue('123');

    await browser.switchToFrame(null);
  }

  async function enterDistinctFieldValues() {
    const withCvv = [
      ['4111111111111111', '4111 1111 1111 1111'],
      ['10', '10'],
      ['28', '28'],
    ['123', '123']
  ];

  await fill(withCvv);
}

async function fill (examples) {
  let i = 0;
  for (const [value, expect] of examples) {
    await browser.switchToFrame(i++);
    const input = await $(sel.hostedFieldInput);
    await input.setValue(value);
    assert.strictEqual(await input.getValue(), expect);
    await browser.switchToFrame(null);
  }
}
