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
  fillDistinctCardElements,
  fillElement,
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
  cvvElement: async () => {
    it('displays field state on the page', async function () {
      await setupElementsStateOutput();
      await assertInputStateChange(() => fillElement(0, '.recurly-hosted-field-input', '123'), 0, {
        empty: false,
        length: 3,
        focus: false,
        valid: true
      });
    });
  },
  cardHostedField: async function () {
    it('displays field state on the page', async function () {
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
  },
  cvvHostedField: async () => {
    it('displays field state on the page', async function () {
      const cvv = {
        empty: false,
        length: 3,
        focus: false,
        valid: true,
      };

      await setupHostedFieldStateOutput();
      await assertInputStateChange(() => fillElement(0, '.recurly-hosted-field-input', '123'), 0, { fields: { cvv } });
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
  const FRAME = 0;
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
  const expectation = (changes) => wrap(Object.assign({}, expect, changes));

  await assertInputStateChange(() => fillCardElement({ expiry: '', cvv: '' }), FRAME, expectation({
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
  }));

  await assertInputStateChange(() => fillCardElement({ cvv: '' }), FRAME, expectation({
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
  }));

  await assertInputStateChange(() => fillCardElement(), FRAME, expectation({
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
  }));
}

async function assertDistinctCardBehavior (...expectations) {
  const entries = [
    '4111111111111111',
    '10',
    '28',
    '123'
  ];

  for (const entry of entries) {
    const i = entries.indexOf(entry);
    await assertInputStateChange(() => fillElement(i, '.recurly-hosted-field-input', entry), i, expectations[i]);
  }
}

async function assertInputStateChange(example, frame, expectation) {
  const blurTriggerEl = await $(sel.firstName);
  const output = await $(sel.output);

  await example();

  await blurTriggerEl.click();
  const actual = JSON.parse(await output.getText());
  assert.deepStrictEqual(actual, expectation);
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
