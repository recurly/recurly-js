const assert = require('assert');
const {
  assertIsAToken,
  EXAMPLES,
  init,
  recurlyEnvironment,
  tokenize
} = require('./support/helpers');

describe('Recurly.js', async function () {
  describe('credit card', async function () {
    beforeEach(init({ fixture: 'hosted-fields-card' }));

    const sel = {
      output: '[data-test=output]',
      form: '[data-test=form]',
      submit: '[data-test=submit]',
      firstName: '[data-test="first-name"]',
      lastName: '[data-test="last-name"]',
      iframe: '.recurly-hosted-field iframe',
      number: 'input[placeholder="Card number"]',
      expiry: 'input[placeholder="MM / YY"]',
      cvv: 'input[placeholder="CVV"]',
      hostedFieldInput: '.recurly-hosted-field-input'
    };

    describe('when configured with defaults', async function () {
      beforeEach(init({ fixture: 'hosted-fields-card' }));

      it('injects a hosted field', async function () {
        const iframe = await $(sel.iframe);
        const url = await iframe.getAttribute('src');

        assert.strictEqual(url.substring(0, url.indexOf('#')), `${recurlyEnvironment().api}/field.html`);
      });

      it('creates a token', async function () {
        await (await $(sel.firstName)).setValue('John');
        await (await $(sel.lastName)).setValue('Doe');

        await browser.switchToFrame(0);

        const number = await $(sel.number);
        const expiry = await $(sel.expiry);
        const cvv = await $(sel.cvv);

        await number.setValue(EXAMPLES.NUMBER);
        await expiry.setValue(EXAMPLES.EXPIRY);
        await cvv.setValue(EXAMPLES.CVV);

        assert.strictEqual(await number.getValue(), EXAMPLES.NUMBER_FORMATTED);
        assert.strictEqual(await expiry.getValue(), EXAMPLES.EXPIRY_FORMATTED);
        assert.strictEqual(await cvv.getValue(), EXAMPLES.CVV);

        await browser.switchToFrame(null);

        const [err, token] = await tokenize(sel.form);
        assert.strictEqual(err, null);
        assertIsAToken(token);
      });
    });

    describe('when using distinct hosted fields and configured to require a cvv', async function () {
      beforeEach(init({ fixture: 'hosted-fields-card-distinct', opts: { required: ['cvv'] } }));

      it('creates a token only when a cvv is provided', async function () {
        await (await $(sel.firstName)).setValue('John');
        await (await $(sel.lastName)).setValue('Doe');

        const withCvv = [
          ['4111111111111111', '4111 1111 1111 1111'],
          ['10', '10'],
          ['28', '28'],
          ['123', '123']
        ];
        const withoutCvv = withCvv.slice(0, -1);

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

        await fill(withoutCvv);
        const [errWithout, tokenWithout] = await tokenize(sel.form);
        assert.strictEqual(errWithout.code, 'validation');
        assert.strictEqual(errWithout.fields.length, 1);
        assert.strictEqual(errWithout.fields[0], 'cvv');
        assert.strictEqual(tokenWithout, null);

        await fill(withCvv);
        const [errWith, tokenWith] = await tokenize(sel.form);
        assert.strictEqual(errWith, null);
        assertIsAToken(tokenWith);
      });
    });
  });

  describe('Bacs bank account', async function () {
    beforeEach(init({ fixture: 'bank-account-bacs' }));

    const sel = {
      output: '[data-test=output]',
      form: '[data-test=form]',
      nameOnAccount: '[data-test="name-on-account"]',
      accountNumber: 'input[data-test="account-number"]',
      accountNumberConfirmation: 'input[data-test="account-number-confirmation"]',
      sortCode: 'input[data-test="sort-code"]',
    };

    it('creates a token', async function () {
      const accountNumber = await $(sel.accountNumber);
      const accountNumberConfirmation = await $(sel.accountNumberConfirmation);
      const sortCode = await $(sel.sortCode);

      await (await $(sel.nameOnAccount)).setValue('John Smith of Australia');

      await accountNumber.setValue('55779911');
      await accountNumberConfirmation.setValue('55779911');
      await sortCode.setValue('200-000');

      assert.strictEqual(await accountNumber.getValue(), '55779911');
      assert.strictEqual(await accountNumberConfirmation.getValue(), '55779911');
      assert.strictEqual(await sortCode.getValue(), '200-000');

      const [err, token] = await browser.executeAsync(function (sel, done) {
        recurly.bankAccount.token(document.querySelector(sel.form), function (err, token) {
          done([err, token]);
        });
      }, sel);

      assert.strictEqual(err, null);
      assertIsAToken(token, expectedType="bacs_bank_account");
    });
  });

  describe('Becs bank account', async function () {
    beforeEach(init({ fixture: 'bank-account-becs' }));

    const sel = {
      output: '[data-test=output]',
      form: '[data-test=form]',
      nameOnAccount: '[data-test="name-on-account"]',
      iframe: '.recurly-hosted-field iframe',
      accountNumber: 'input[data-test="account-number"]',
      accountNumberConfirmation: 'input[data-test="account-number-confirmation"]',
      bsbCode: 'input[data-test="bsb-code"]',
    };

    it('creates a token', async function () {
      await (await $(sel.nameOnAccount)).setValue('John Smith, OBE');

      const accountNumber = await $(sel.accountNumber);
      const accountNumberConfirmation = await $(sel.accountNumberConfirmation);

      const bsbCode = await $(sel.bsbCode);

      await accountNumber.setValue('55779911');
      await accountNumberConfirmation.setValue('55779911');
      await bsbCode.setValue('200000');

      assert.strictEqual(await accountNumber.getValue(), '55779911');
      assert.strictEqual(await accountNumberConfirmation.getValue(), '55779911');
      assert.strictEqual(await bsbCode.getValue(), '200000');

      const [err, token] = await browser.executeAsync(function (sel, done) {
        recurly.bankAccount.token(document.querySelector(sel.form), function (err, token) {
          done([err, token]);
        });
      }, sel);

      assert.strictEqual(err, null);
    });
  });

  describe('fraud', async function () {
    beforeEach(async function () {
      await browser.url(`e2e`);
      await browser.executeAsync(function (recurlyEnvironment, done) {
        const config = {
          api: recurlyEnvironment.api,
          publicKey: recurlyEnvironment.publicKey,
          fraud: {
            kount: {
              dataCollector: true,
              form: document.querySelector('form')
            }
          }
        };
        recurly.configure(config);
        recurly.ready(function () {
          done();
        });
      }, recurlyEnvironment());
    });

    it('attaches an input with fraud session ID', async () => {
      const script = await $('form script');
      await script.waitForExist(2000);

      const scriptSrc = await script.getAttribute('src');
      const kaxsdc = await $('.kaxsdc');
      const fraudSessionIdInput= await $('input[data-recurly="fraud_session_id"]');
      const sessionId = await fraudSessionIdInput.getValue();

      await assert.strictEqual(sessionId.length, 32);
      await assert.strictEqual(scriptSrc, `https://tst.kaptcha.com/collect/sdk?m=740001&s=${sessionId}`);
      await assert.strictEqual(await kaxsdc.isExisting(), true);
    });
  });
});
