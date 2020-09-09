const assert = require('assert');
const {
  BROWSERS,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  elementAndFieldSuite,
  environmentIs,
  EXAMPLES,
  fillCardElement,
  init
} = require('./support/helpers');

const sel = {
  output: '[data-test=output]',
  firstName: '[data-test="first-name"]',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]'
};

describe('Field State', elementAndFieldSuite({
  cardElement: () => {
    it('displays field state on the page', async function () {
      // Skip Electron due to element blur incompatibility
      if (environmentIs(BROWSERS.ELECTRON)) {
        return this.skip();
      }
      await setupElementsStateOutput();
      await assertCardBehavior();
    });
  },
  distinctCardElements: async () => {
    it('displays field state on the page', async function () {
      await setupElementsStateOutput();
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
    });
  },
  cardHostedField: async function () {
    it('displays field state on the page', async function () {
      // Skip Electron due to element blur incompatibility
      if (environmentIs(BROWSERS.ELECTRON)) {
        return this.skip();
      }
      await setupHostedFieldStateOutput();
      await assertCardBehavior({ wrap: card => ({ fields: { card } }) });
    });
  },
  distinctCardHostedFields: async () => {
    it('displays field state on the page', async function () {
      await setupHostedFieldStateOutput();
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
    });
  }
}));

async function setupElementsStateOutput () {
  return await browser.execute(function (sel) {
    var output = document.querySelector(sel.output);

    window.__e2e__.elementReferences.forEach(function (el) {
      el.on('change', function (state) {
        output.innerText = JSON.stringify(state);
      });
    });
  }, sel);
}

async function setupHostedFieldStateOutput () {
  return await browser.execute(function (sel) {
    var output = document.querySelector(sel.output);

    recurly.on('change', function (state) {
      output.innerText = JSON.stringify(state);
    });
  }, sel);
}

async function assertCardBehavior ({ wrap = obj => obj } = {}) {
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
  const assertStateOutputIs = async changes => {
    assert.deepStrictEqual(
      await actual(),
      wrap(Object.assign({}, expect, changes))
    );
  };

  // await browser.switchToFrame(0);
  // const number = await $(sel.number);
  // await number.setValue(EXAMPLES.NUMBER);
  // await browser.waitUntil(async () => (await number.getValue()).length >= 19);
  // await browser.switchToFrame(null);
  await fillCardElement({
    expiry: '',
    cvv: ''
  });
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

  await fillCardElement({
    cvv: ''
  });
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

  // await browser.switchToFrame(0);
  // await (await $(sel.cvv)).addValue(EXAMPLES.CVV);
  // await browser.switchToFrame(null);
  await fillCardElement();
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
    await input.addValue(entry);
    if (environmentIs(BROWSERS.EDGE)) {
      await browser.waitUntil(async () => (await input.getValue()).replace(/ /g, '') === entry);
    }
    await browser.switchToFrame(null);
    await firstName.click();
    await assertStateOutputIs(expectations[i]);
  }
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
