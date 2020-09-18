const assert = require('assert');
const {
  init
} = require('./support/helpers');

const PRICING = {
    plan: '#my-checkout > select',
    adjustment: '#my-checkout > input[type=checkbox]:nth-child(13)'
};

const INPUTS= [
  ['plan_quantity',   'input[data-recurly="plan_quantity"]',    '1'               ],
  ['coupon',          'input[data-recurly="coupon"]',           'code1'           ],
  ['gift_card',       'input[data-recurly="gift_card"]',        'P4701UT9OKW6XFYN'],
  ['tax_code',        'input[data-recurly="tax_code"]',         'digital'         ],
  ['postal_code',     'input[data-recurly="postal_code"]',      '94110'           ],
  ['country',         'input[data-recurly="country"]',          'US'              ],
  ['vat_number',      'input[data-recurly="vat_number"]',       'vat1'            ],
  ['tax_amount_now',  'input[data-recurly="tax_amount_now"]',   '1.99'            ],
  ['tax_amount_next', 'input[data-recurly="tax_amount_next"]',  '2.01'            ]
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
  ['[data-recurly=currency_symbol]',    ''      ],
  ['[data-recurly=total_next]',         '0.00'  ],
  ['[data-recurly=subtotal_next]',      '0.00'  ],
  ['[data-recurly=subscriptions_next]', '0.00'  ],
  ['[data-recurly=adjustments_next]',   '0.00'  ],
  ['[data-recurly=discount_next]',      '0.00'  ],
  ['[data-recurly=taxes_next]',         '0.00'  ],
  ['[data-recurly=gift_card_next]',     '0.00'  ]
];

describe('Pricing test', async () => {
  beforeEach(init({ fixture: 'pricing' }));

    it.skip("set pricing test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);

      const plan = await $(PRICING.plan);
      await plan.click()
      await plan.selectByAttribute('value', 'basic');

      const adjustment = await $(PRICING.adjustment);
      await adjustment.click()
      // await plan.selectByAttribute('value', 'basic');

      for (const [name, selector, value] of INPUTS) {
        const input = await $(selector)
        await input.setValue(value)
      }

      // For this to work, the plan needs to have adjustments, discount, giftcard, items, 
      // addons, taxes setup so they are not 0.00
      for (const [selector, value] of OUTPUTS) {
        const output = await $(selector)
        await browser.waitUntil(() => output.getText() !== value);
        const inp = await output.getText()
        console.log('1111111=', inp)
        assert.notEqual(inp, value)
        // assert.notEqual(await output.getText(), value)
      }

    });

    it("set.plan event emitter test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);

      const plan = await $(PRICING.plan);
      await plan.click()
      await plan.selectByAttribute('value', 'basic');

      const state = await getEventState('set.plan')
      assert.strictEqual(state.plan.name, 'Basic');
      assert.strictEqual(state.plan.code, 'basic');
    });

    it("set.address event emitter test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);

      const plan = await $(PRICING.plan);
      await plan.click()
      await plan.selectByAttribute('value', 'basic');

      const state = await getEventState('set.address')
      assert.strictEqual(state.country, '');
      assert.strictEqual(state.postal_code, '');
    });

    it("set.tax event emitter test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);
      const input = await $('input[data-recurly="vat_number"]');
      await input.setValue('vat1')

      const state = await getEventState('set.tax')
      assert.strictEqual(state.vat_number, 'vat1');
    });

    it("set.coupon event emitter test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);
      const input = await $('input[data-recurly="coupon"]');
      await input.setValue('code1')

      const state = await getEventState('set.coupon')
      assert.strictEqual(state.code, 'code1');
      assert.strictEqual(state.name, 'coupon1');
    });

    it("set.adjustment event emitter test", async function () {
      await attachCheckPricing()

      await browser.switchToFrame(null);
      const plan = await $(PRICING.plan);
      await plan.click()
      await plan.selectByAttribute('value', 'basic');

      const state = await getEventState('set.adjustment')
      assert.notEqual(state.amount, '0.00')
      assert.strictEqual(state.currency, 'USD');
      assert.strictEqual(state.taxCode, 'digital');
      assert.strictEqual(state.taxExempt, true);
    });

  });

async function attachCheckPricing (event) {
  await browser.switchToFrame(null);
  await browser.execute(function () {
    var checkoutPricing = recurly.Pricing.Checkout();
    checkoutPricing.attach('#my-checkout');
    window.checkoutPricing = checkoutPricing;
  });
}


async function getEventState (event) {
  await browser.switchToFrame(null);
  return await browser.executeAsync(function (event, done) {
    window.checkoutPricing.on(event, function (state) {
      done(state);
    });
  }, event);
}
