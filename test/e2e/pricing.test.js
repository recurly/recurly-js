const assert = require('assert');
const {
  init
} = require('./support/helpers');

const PRICING = {
    plan: '#my-checkout > select'
};

const INPUTS = [
  ['coupon',      'input[data-recurly="coupon"]',     'code1'           ],
  ['gift_card',   'input[data-recurly="gift_card"]',  '1I2QUYWXAP7FZ3GL']
];

// index 0 is the selector and index 1 is the default value.
const OUTPUTS = [
  ['[data-recurly=total_now]',          '0.00'  ],
  ['[data-recurly=subtotal_now]',       '0.00'  ],
  ['[data-recurly=subscriptions_now]',  '0.00'  ],
  ['[data-recurly=adjustments_now]',    '0.00'  ],
  ['[data-recurly=discount_now]',       '0.00'  ],
  ['[data-recurly=taxes_now]',          '0.00'  ],
  ['[data-recurly=gift_card_now]',      '0.00'  ],
  ['[data-recurly=currency_code]',      ''      ],
  ['[data-recurly=currency_symbol]',    ''      ]
];

describe('Pricing test', async () => {
  beforeEach(init({ fixture: 'pricing' }));

    it.skip("set pricing test", async function () {
      await browser.switchToFrame(null);

      await browser.execute(function () {
        var checkoutPricing = recurly.Pricing.Checkout();
        checkoutPricing.attach('#my-checkout');
      });

      const plan = await $(PRICING.plan);
      await plan.click()
      await plan.selectByAttribute('value', 'basic');

      for (const [name, selector, value] of INPUTS) {
        const input = await $(selector)
        await input.setValue(value)
      }

      // For this to work, the plan needs to have adjustments, discount, giftcard, items, 
      // addons, taxes setup so they are not 0.00
      for (const [selector, value] of OUTPUTS) {
        const output = await $(selector)
        await browser.waitUntil(() => output.getText() !== value);
        assert.notEqual(output, value)
      }

    });

});
