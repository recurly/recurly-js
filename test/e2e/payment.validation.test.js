const assert = require('assert');
const {
  assertIsAToken,
  environment,
  init
} = require('./support/helpers');

const SEL_ACH = {
  output: '[data-test=output]',
  form: '[data-test=form]',
  nameOnAccount: '[data-test="name-on-account"]',
  routingNumber: 'input[data-test="routing-number"]',
  accountNumber: 'input[data-test="account-number"]',
  accountNumberConfirmation: 'input[data-test="account-number-confirmation"]',
  accountType: 'input[data-test="account_type"]',
  country: 'input[data-test="country"]'
};

const SEL_SEPA = {
  output: '[data-test=output]',
  form: '[data-test=form]',
  nameOnAccount: '[data-test="name-on-account"]',
  iban: 'input[data-test="iban"]'
};

describe('recurly.bankAccount payment validation tests', async () => {
  describe('When it is a bank-account-ach', async function () {
    beforeEach(init({ fixture: 'bank-account-ach' }));

    it('gets token succesfully', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const accountType = await $(SEL_ACH.accountType);
      const country = await $(SEL_ACH.country);

      await name.setValue('John Rambo, OBE');
      await routingNumber.setValue('123456780');
      await accountNumber.setValue('111111111');
      await accountNumberConfirmation.setValue('111111111');
      await accountType.setValue('checking');
      await country.setValue('US');

      assert.strictEqual(await routingNumber.getValue(), '123456780');
      assert.strictEqual(await accountNumber.getValue(), '111111111');
      assert.strictEqual(await accountNumberConfirmation.getValue(), '111111111');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err, null);
      assertIsAToken(token, 'bank_account')
    });

    it('missing name_on_account', async function () {
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const accountType = await $(SEL_ACH.accountType);
      const country = await $(SEL_ACH.country);

      await routingNumber.setValue('123456780');
      await accountNumber.setValue('111111111');
      await accountNumberConfirmation.setValue('111111111');
      await accountType.setValue('checking');
      await country.setValue('US');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'name_on_account');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });

    it('missing routing number', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const accountType = await $(SEL_ACH.accountType);
      const country = await $(SEL_ACH.country);

      await name.setValue('John Rambo, OBE');
      await accountNumber.setValue('111111111');
      await accountNumberConfirmation.setValue('111111111');
      await accountType.setValue('checking');
      await country.setValue('US');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'routing_number');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });

    it('missing account_number', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountType = await $(SEL_ACH.accountType);
      const country = await $(SEL_ACH.country);

      await name.setValue('John Rambo, OBE');
      await accountNumberConfirmation.setValue('111111111');
      await routingNumber.setValue('123456780');
      await accountType.setValue('checking');
      await country.setValue('US');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'account_number_confirmation');
      assert.strictEqual(err.fields[1], 'account_number');
      assert.strictEqual(err.fields.length, 2);
      assert.strictEqual(token, null);
    });

    it('missing account_number_confirmation', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountType = await $(SEL_ACH.accountType);
      const country = await $(SEL_ACH.country);

      await name.setValue('John Rambo, OBE');
      await routingNumber.setValue('123456780');
      await accountNumber.setValue('111111111');
      await accountType.setValue('checking');
      await country.setValue('US');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'account_number_confirmation');
      assert.strictEqual(err.fields[1], 'account_number_confirmation');
      assert.strictEqual(err.fields.length, 2);
      assert.strictEqual(token, null);
    });

    it('missing account_type', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const country = await $(SEL_ACH.country);

      await name.setValue('John Rambo, OBE');
      await routingNumber.setValue('123456780');
      await accountNumber.setValue('111111111');
      await accountNumberConfirmation.setValue('111111111');
      await country.setValue('US');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'account_type');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });

    it('missing country', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const routingNumber = await $(SEL_ACH.routingNumber);
      const accountNumber = await $(SEL_ACH.accountNumber);
      const accountNumberConfirmation = await $(SEL_ACH.accountNumberConfirmation);
      const accountType = await $(SEL_ACH.accountType);

      await name.setValue('John Rambo, OBE');
      await routingNumber.setValue('123456780');
      await accountNumber.setValue('111111111');
      await accountNumberConfirmation.setValue('111111111');
      await accountType.setValue('checking');

      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'country');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });

    it('missing all fields', async function () {
      const [err, token] = await tokenizeBankAccount(SEL_ACH)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'account_number');
      assert.strictEqual(err.fields[1], 'account_number_confirmation');
      assert.strictEqual(err.fields[2], 'routing_number');
      assert.strictEqual(err.fields[3], 'account_type');
      assert.strictEqual(err.fields[4], 'name_on_account');
      assert.strictEqual(err.fields[5], 'country');
      assert.strictEqual(err.fields.length, 6);
      assert.strictEqual(token, null);
    });
  });

  describe('When it is a bank-account-sepa', async function () {
    beforeEach(init({ fixture: 'bank-account-sepa' }));

    it('gets token succesfully', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      const iban = await $(SEL_SEPA.iban);

      await name.setValue('John Rambo, OBE');
      await iban.setValue('FR1420041010050500013M02606');
      assert.strictEqual(await iban.getValue(), 'FR1420041010050500013M02606');

      const [err, token] = await tokenizeBankAccount(SEL_SEPA)

      assert.strictEqual(err, null);
      assertIsAToken(token, 'iban_bank_account')
    });

    it('missing iban', async function () {
      const name = await $(SEL_SEPA.nameOnAccount)
      await name.setValue('John Rambo, OBE');

      const [err, token] = await tokenizeBankAccount(SEL_SEPA)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'iban');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });

    it('missing name_on_account', async function () {
      const iban = await $(SEL_SEPA.iban);
      await iban.setValue('FR1420041010050500013M02606');

      const [err, token] = await tokenizeBankAccount(SEL_SEPA)

      assert.strictEqual(err.message, 'There was an error validating your request.');
      assert.strictEqual(err.fields[0], 'name_on_account');
      assert.strictEqual(err.fields.length, 1);
      assert.strictEqual(token, null);
    });
  });
});

async function tokenizeBankAccount (sel) {
  return await browser.executeAsync(function (sel, done) {
    recurly.bankAccount.token(document.querySelector(sel.form), function (err, token) {
      done([err, token]);
    });
  }, sel);
}
