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
          var cardElement = window.__e2e__.elementReferences[0];

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
        return;
        await assertCombinedCardBehavior();
      break;
      case VARIANTS.CardHostedField:
        return;
        await assertCombinedCardBehavior({ wrap: card => ({ fields: { card } }) });
      break;
      case VARIANTS.DistinctCardElements:
        return;
        await assertDistinctCardBehavior(
          // number
          {
            valid: true,
            firstSix: '411111',
            lastFour: '1111',
            brand: 'visa',
            length: 16,
            empty: false,
            focus: true
          },
          // month
          {
            empty: false,
            length: 2,
            focus: true,
            valid: true
          },
          // year
          {
            empty: false,
            length: 2,
            focus: true,
            valid: true
          },
          // cvv
          {
            empty: false,
            length: 3,
            focus: true,
            valid: true
          }
        );
      break;
      case VARIANTS.DistinctCardHostedFields:
        const number = focus => ({
          valid: true,
          firstSix: '411111',
          lastFour: '1111',
          brand: 'visa',
          length: 16,
          empty: false,
          focus
        });
        const month = focus => ({
          empty: false,
          length: 2,
          focus,
          valid: true
        });
        const year = focus => ({
          empty: false,
          length: 2,
          focus,
          valid: true,
        });
        const cvv = focus => ({
          empty: false,
          length: 3,
          focus,
          valid: true
        });
        await assertDistinctCardBehavior(
          hostedFieldState({ number: number(true) }),
          hostedFieldState({ number: number(false), month: month(true) }),
          hostedFieldState({ number: number(false), month: month(false), year: year(true) }),
          hostedFieldState({
            number: number(false),
            month: month(false),
            year: year(false),
            cvv: cvv(true)
          })
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
  const output = await $(sel.output);
  const actual = async () => JSON.parse(await output.getText());
  const assertStateOutputIs = async expect => assert.deepStrictEqual(
    await actual(),
    expect
  );

  let i = 0;
  const frames = await browser.$$('iframe');
  for (const frame of frames) {
    await browser.switchToFrame(frame);
    await (await $('input')).setValue(entries[i]);
    await browser.switchToFrame(null);
    await assertStateOutputIs(expectations[i++]);
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

  const output = await $(sel.output);
  const actual = async () => JSON.parse(await output.getText());
  const assertStateOutputIs = async changes => assert.deepStrictEqual(
    await actual(),
    wrap(Object.assign({}, expect, changes))
  );

  assertStateOutputIs(expect);

  await browser.switchToFrame(0);
  await (await $(sel.number)).setValue('4111111111111111');
  await browser.switchToFrame(null);
  await (await $(sel.firstName)).click();

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

  await assertStateOutputIs({
    firstSix: '411111',
    lastFour: '1111',
    brand: 'visa',
    empty: false,
    focus: true,
    number: {
      empty: false,
      focus: false,
      valid: true
    },
    expiry: {
      empty: false,
      focus: true,
      valid: true
    }
  });

  await browser.switchToFrame(0);
  await (await $(sel.cvv)).setValue('123');
  await browser.switchToFrame(null);

  await assertStateOutputIs({
    firstSix: '411111',
    lastFour: '1111',
    brand: 'visa',
    empty: false,
    focus: true,
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
      focus: true,
      valid: true
    }
  });

  await (await $(sel.arbitrary)).click();

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
