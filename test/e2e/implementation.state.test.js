const assert = require('assert');
const {
  BROWSERS,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  elementAndFieldSuite,
  environmentIs,
  init
} = require('./support/helpers');

const sel = {
  output: '[data-test=output]',
  firstName: '[data-test="first-name"]',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]',
  arbitrary: 'input[data-test="arbitrary-input-0"]'
};

describe('Field State', elementAndFieldSuite(variant => {
  it(...displaysStateOutput(variant));
}));

function displaysStateOutput (variant) {
  const { VARIANTS } = elementAndFieldSuite;

  return ['displays field state on the page', async () => {
    // Setup
    switch (variant) {
      case VARIANTS.CardHostedField:
      case VARIANTS.DistinctCardHostedFields:
        await browser.execute(function (sel) {
          var output = document.querySelector(sel.output);

          recurly.on('change', function (state) {
            output.innerText = JSON.stringify(state);
          });
        }, sel);
      break;
      case VARIANTS.CardElement:
      case VARIANTS.DistinctCardElements:
        await browser.execute(function (sel) {
          var output = document.querySelector(sel.output);

          window.__e2e__.elementReferences.forEach(function (el) {
            el.on('change', function (state) {
              output.innerText = JSON.stringify(state);
            });
          });
        }, sel);
      break;
    }

    // Assertions
    switch (variant) {
      case VARIANTS.CardElement:
        await assertCombinedCardBehavior();
      break;
      case VARIANTS.CardHostedField:
        await assertCombinedCardBehavior({ wrap: card => ({ fields: { card } }) });
      break;
      case VARIANTS.DistinctCardElements:
        const focus = environmentIs(BROWSERS.EDGE);
        await assertDistinctCardBehavior(
          // number
          {
            valid: true,
            firstSix: '411111',
            lastFour: '1111',
            brand: 'visa',
            length: 16,
            empty: false,
            focus: false
          },
          // month
          {
            empty: false,
            length: 2,
            focus: false,
            valid: true
          },
          // year
          {
            empty: false,
            length: 2,
            focus: false,
            valid: true
          },
          // cvv
          {
            empty: false,
            length: 3,
            focus: false,
            valid: true
          }
        );
      break;
      case VARIANTS.DistinctCardHostedFields:
        const number = {
          valid: true,
          firstSix: '411111',
          lastFour: '1111',
          brand: 'visa',
          length: 16,
          empty: false,
          focus: false
        };
        const month = {
          empty: false,
          length: 2,
          focus: false,
          valid: true
        };
        const year = {
          empty: false,
          length: 2,
          focus: false,
          valid: true,
        };
        const cvv = {
          empty: false,
          length: 3,
          focus: false,
          valid: true
        };
        await assertDistinctCardBehavior(
          hostedFieldState({ number }),
          hostedFieldState({ number, month }),
          hostedFieldState({ number, month, year }),
          hostedFieldState({ number, month, year, cvv })
        );
      break;
    }
  }];
}

function hostedFieldState ({ number, month, year, cvv }) {
  return {
    fields: {
      number: Object.assign({
        brand: 'unknown',
        empty: true,
        firstSix: '',
        focus: false,
        lastFour: '',
        length: 0,
        valid: false
      }, number),
      month: Object.assign({
        empty: true,
        focus: false,
        length: 0
      }, month),
      year: Object.assign({
        empty: true,
        focus: false,
        length: 0,
        valid: false
      }, year),
      cvv: Object.assign({
        empty: true,
        focus: false,
        length: 0,
        valid: false
      }, cvv)
    }
  };
}

async function assertDistinctCardBehavior (...expectations) {
  const entries = [
    '4111111111111111',
    '10',
    '28',
    '123'
  ];
  const firstName = await $(sel.firstName);
  const output = await $(sel.output);
  const actual = async () => JSON.parse(await output.getText());
  const assertStateOutputIs = async expect => assert.deepStrictEqual(
    await actual(),
    expect
  );

  for (const entry of entries) {
    const i = entries.indexOf(entry);
    await browser.switchToFrame(i);
    const input = await $('.recurly-hosted-field-input');
    await input.setValue(entry);
    await browser.switchToFrame(null);
    await firstName.click();
    await assertStateOutputIs(expectations[i]);
  }
}

async function assertCombinedCardBehavior ({ wrap = obj => obj } = {}) {
  const expect = {
    valid: false,
    firstSix: '',
    lastFour: '',
    brand: '',
    empty: false,
    focus: false,
    number: {
      empty: true,
      focus: false,
      valid: false
    },
    expiry: {
      empty: true,
      focus: false,
      valid: false
    },
    cvv: {
      empty: true,
      focus: false,
      valid: false
    }
  };

  const firstName = await $(sel.firstName);
  const output = await $(sel.output);
  const actual = async () => JSON.parse(await output.getText());
  const assertStateOutputIs = async changes => assert.deepStrictEqual(
    await actual(),
    wrap(Object.assign({}, expect, changes))
  );

  await browser.switchToFrame(0);
  await (await $(sel.number)).setValue('4111111111111111');
  await browser.switchToFrame(null);
  await firstName.click();

  await assertStateOutputIs({
    firstSix: '411111',
    lastFour: '1111',
    brand: 'visa',
    empty: false,
    focus: false,
    number: {
      empty: false,
      focus: false,
      valid: true
    }
  });

  await browser.switchToFrame(0);
  await (await $(sel.expiry)).setValue('1028');
  await browser.switchToFrame(null);
  await firstName.click();

  await assertStateOutputIs({
    firstSix: '411111',
    lastFour: '1111',
    brand: 'visa',
    empty: false,
    focus: false,
    number: {
      empty: false,
      focus: false,
      valid: true
    },
    expiry: {
      empty: false,
      focus: false,
      valid: true
    }
  });

  await browser.switchToFrame(0);
  await (await $(sel.cvv)).setValue('123');
  await browser.switchToFrame(null);
  await firstName.click();

  await assertStateOutputIs({
    firstSix: '411111',
    lastFour: '1111',
    brand: 'visa',
    empty: false,
    focus: false,
    valid: true,
    number: {
      empty: false,
      focus: false,
      valid: true
    },
    expiry: {
      empty: false,
      focus: false,
      valid: true
    },
    cvv: {
      empty: false,
      focus: false,
      valid: true
    }
  });
}
