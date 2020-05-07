const assert = require('assert');
const {
  init,
  tokenize,
  assertIsAToken,
  SEL,
  NAME
} = require('./support/helpers');

const yearAt = add => ((new Date()).getFullYear() + add).toString().substring(2);
const EXPIRED = `10 / ${yearAt(1)}`
const CVC = ['123', '1234']

const GOOD_CARDS = [
  ['visa',  '4111 1111 1111 1111', '4111 1111 1111 1111', '10', yearAt(1), CVC[0] ],
  ['mc',    '5111-0051-1105-1128', '5111 0051 1105 1128', '10', yearAt(1), CVC[0] ],
  ['amex',  '3711 443711 44376',   '3711 443711 44376',   '10', yearAt(1), CVC[1] ],
  ['dis',   '6011-0160-1101-6011', '6011 0160 1101 6011', '10', yearAt(1), CVC[0] ],
  ['diner', '3643 893643 8936',    '3643 893643 8936',    '10', yearAt(1), CVC[0] ],
  ['jcb',   '3566-0035-6600-3566', '3566 0035 6600 3566', '10', yearAt(1), CVC[0] ]
]

const BAD_CARDS = [
  ['visa',  '4111111111111115',    '4111 1111 1111 1115', '10', yearAt(1), CVC[0] ],
  ['mc',    '5111005111051121',    '5111 0051 1105 1121', '10', yearAt(1), CVC[0] ],
  ['amex',  '371144371144379',     '3711 443711 44379',   '10', yearAt(1), CVC[1] ],
  ['dis',   '6011016011016019',    '6011 0160 1101 6019', '10', yearAt(1), CVC[0] ],
  ['diner', '36438936438939',      '3643 893643 8939',    '10', yearAt(1), CVC[0] ],
  ['jcb',   '3566003566003569',    '3566 0035 6600 3569', '10', yearAt(1), CVC[0] ]
]


// Test all the style defaults properties for both combined and distinct fields
describe('Credit card number validation tests', async () => {
  describe('when fixture is hosted-fields-card', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card' })); 

    it(`Test all the good card numbers: ${GOOD_CARDS.map(p => p[1])}`, async function () {
        const iframe = await $(SEL.iframe);
        await (await $(SEL.firstName)).setValue(NAME.firstName);
        await (await $(SEL.lastName)).setValue(NAME.lastName);

        await browser.switchToFrame(0);
        const number = await $(SEL.number)
        const expiry = await $(SEL.expiry)
        const cvv = await $(SEL.cvv)

        for (const [brand, num, formatted, mm, yy, cvc] of GOOD_CARDS) {
            await number.setValue(num)
            await expiry.setValue(EXPIRED)
            await cvv.setValue(cvc)

            assert.strictEqual(await number.getValue(), formatted)
            assert.strictEqual(await expiry.getValue(), EXPIRED)
            assert.strictEqual(await cvv.getValue(), cvc)

            await browser.switchToFrame(null);
            const [err, token] = await tokenize(SEL.form);
        
            assert.strictEqual(err, null);
            assertIsAToken(token);
            await browser.switchToFrame(0);
        };

    });

    it(`Test all the bad card numbers: ${BAD_CARDS.map(p => p[1])}`, async function () {
        const iframe = await $(SEL.iframe);
        await (await $(SEL.firstName)).setValue(NAME.firstName);
        await (await $(SEL.lastName)).setValue(NAME.lastName);

        await browser.switchToFrame(0);
        const number = await $(SEL.number)
        const expiry = await $(SEL.expiry)
        const cvv = await $(SEL.cvv)

        for (const [brand, num, formatted, mm, yy, cvc] of BAD_CARDS) {
            await number.setValue(num)
            await expiry.setValue(EXPIRED)
            await cvv.setValue(cvc)

            assert.strictEqual(await number.getValue(), formatted)
            assert.strictEqual(await expiry.getValue(), EXPIRED)
            assert.strictEqual(await cvv.getValue(), cvc)

            await browser.switchToFrame(null);
            const [err, token] = await tokenize(SEL.form);
        
            assert.strictEqual(err.message, 'There was an error validating your request.');
            assert.strictEqual(token, null);
            await browser.switchToFrame(0);
        };
    });
  });

  describe('when fixture is hosted-fields-card-distinct', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));  

    it(`Test all the good card numbers: ${GOOD_CARDS.map(p => p[1])}`, async function () {
      await browser.switchToFrame(0);
      const input = await $('.recurly-hosted-field-input');

      
      for (const [brand, num, formatted, mm, yy, cvc] of GOOD_CARDS) {
        for (const type of ['number', 'month', 'year', 'cvv']) {

          await browser.switchToFrame(null);
          await (await $(SEL.firstName)).setValue('John');
          await (await $(SEL.lastName)).setValue('Rambo');

          const frame = await $(`.recurly-hosted-field-${type} iframe`);
          await browser.switchToFrame(frame);

          const number = num
          const month = mm
          const year = yy
          const cvv = cvc

          await input.setValue(eval(type));
          await browser.switchToFrame(null);
             
        };
      }
      const [err, token] = await tokenize(SEL.form);
      assert.strictEqual(err, null);
      assertIsAToken(token)
      await browser.switchToFrame(0);

    });

    it(`Test all the bad card numbers: ${BAD_CARDS.map(p => p[1])}`, async function () {
      await browser.switchToFrame(0);
      const input = await $('.recurly-hosted-field-input');
      
      for (const [brand, num, formatted, mm, yy, cvc] of BAD_CARDS) {
        for (const type of ['number', 'month', 'year', 'cvv']) {

          await browser.switchToFrame(null);
          await (await $(SEL.firstName)).setValue('John');
          await (await $(SEL.lastName)).setValue('Rambo');

          const frame = await $(`.recurly-hosted-field-${type} iframe`);
          await browser.switchToFrame(frame);

          const number = num
          const month = mm
          const year = yy
          const cvv = cvc

          await input.setValue(eval(type));
          await browser.switchToFrame(null);
             
        };
      }
      const [err, token] = await tokenize(SEL.form);
      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(token, null);
      await browser.switchToFrame(0);

    });
  });
});
