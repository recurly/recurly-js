/* eslint-disable no-undef */
import assert from 'assert';
import { fixture, clearFixture } from './support/fixtures';
import { initRecurly, testBed } from './support/helpers';

describe('Recurly.BankRedirect', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly({ });
    this.bankRedirect = this.recurly.BankRedirect();
    this.recurly.ready(() => done());
  });

  afterEach(function () {
    this.recurly.destroy();
  });

  describe('iDeal', function () {
    describe('loadBanks', function () {
      beforeEach(function () {
        this.payload = {
          payment_method_type: 'ideal',
        };
      });

      afterEach(function () {
        clearFixture();
      });

      it('raises an error for a missing type', function (done) {
        this.payload.payment_method_type = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'payment_method_type cannot be blank');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.payload);
      });

      it('raises an error for an invalid type', function (done) {
        this.payload.payment_method_type = 'wrong';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invalid payment_method_type');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.payload);
      });

      it('raises an error for a failed api request', function (done) {
        this.payload.error = true;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'banks-error');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.payload);
      });

      it('emit the banks without error for a successfully api request', function (done) {
        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('banks', banks => {
          assert.ok(banks);
          done();
        });

        this.bankRedirect.loadBanks(this.payload);
      });

      it('attach the banks to a select element', function (done) {
        fixture('selectLists', 'issuer_id');
        const $select = testBed().querySelector('#issuer_id');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuer_id" (id|name)="issuer_id">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.payload, '#issuer_id');
      });

      it('attach the banks to a select element after cleanup the select', function (done) {
        fixture('selectListsFull', { list: [{ id: 'bank99', name: 'Bank 99' }], selectId: 'issuer_id' });
        const $select = testBed().querySelector('#issuer_id');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuer_id" (id|name)="issuer_id">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.payload, '#issuer_id');
      });

      it('attach the banks to a select element into a container', function (done) {
        fixture('emptyForm');
        const $form = testBed().querySelector('#test-form');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<form id="test-form">',
            '<select (id|name)="issuer_id" (id|name)="issuer_id">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>',
            '</form>'
          ].join('')).test($form.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.payload, '#test-form');
      });
    });

    describe('start', function () {
      beforeEach(function () {
        this.startPayload = {
          payment_method_type: 'ideal',
          issuer_id: 'issuer123',
          invoice_uuid: 'invoice123'
        };

        this.sandbox = sinon.createSandbox();
        this.sandbox.spy(this.recurly, 'Frame');
      });

      afterEach(function () {
        this.sandbox.restore();
      });

      validateBankRedirectStart({
        requiredFields: ['payment_method_type', 'invoice_uuid', 'issuer_id'],
      });
    });
  });

  describe('sofort', function () {
    describe('loadCountries', function () {
      beforeEach(function () {
        this.payload = {
          payment_method_type: 'sofort',
        };
      });

      afterEach(function () {
        clearFixture();
      });

      it('raises an error for a missing type', function (done) {
        this.payload.payment_method_type = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'payment_method_type cannot be blank');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadCountries(this.payload);
      });

      it('raises an error for an invalid type', function (done) {
        this.payload.payment_method_type = 'wrong';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invalid payment_method_type');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadCountries(this.payload);
      });

      it('emits the countries without error', function (done) {
        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('countries', countries => {
          assert.ok(countries);
          done();
        });

        this.bankRedirect.loadCountries(this.payload);
      });

      it('attach the countries to a select element', function (done) {
        fixture('selectLists', 'country_code');
        const $select = testBed().querySelector('#country_code');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('countries', () => {
          assert.ok(new RegExp([
            '<select (id|name)="country_code" (id|name)="country_code">',
            '<option value="AT">Austria</option>',
            '<option value="BE">Belgium</option>',
            '<option value="DE">Germany</option>',
            '<option value="IT">Italy</option>',
            '<option value="ES">Spain</option>',
            '<option value="NL">The Netherlands</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadCountries(this.payload, '#country_code');
      });

      it('attach the countries to a select element after cleanup the select', function (done) {
        fixture('selectListsFull', { list: [{ id: 'UY', name: 'Uruguay' }], selectId: 'country_code' });
        const $select = testBed().querySelector('#country_code');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('countries', () => {
          assert.ok(new RegExp([
            '<select (id|name)="country_code" (id|name)="country_code">',
            '<option value="AT">Austria</option>',
            '<option value="BE">Belgium</option>',
            '<option value="DE">Germany</option>',
            '<option value="IT">Italy</option>',
            '<option value="ES">Spain</option>',
            '<option value="NL">The Netherlands</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadCountries(this.payload, '#country_code');
      });

      it('attach the countries to a select element into a container', function (done) {
        fixture('emptyForm');
        const $form = testBed().querySelector('#test-form');

        this.bankRedirect.on('error', assert.fail);
        this.bankRedirect.on('countries', () => {
          assert.ok(new RegExp([
            '<form id="test-form">',
            '<select (id|name)="country_code" (id|name)="country_code">',
            '<option value="AT">Austria</option>',
            '<option value="BE">Belgium</option>',
            '<option value="DE">Germany</option>',
            '<option value="IT">Italy</option>',
            '<option value="ES">Spain</option>',
            '<option value="NL">The Netherlands</option>',
            '</select>',
            '</form>'
          ].join('')).test($form.outerHTML));
          done();
        });
        this.bankRedirect.loadCountries(this.payload, '#test-form');
      });
    });

    describe('start', function () {
      beforeEach(function () {
        this.startPayload = {
          payment_method_type: 'sofort',
          country_code: 'NA',
          invoice_uuid: 'invoice123'
        };

        this.sandbox = sinon.createSandbox();
        this.sandbox.spy(this.recurly, 'Frame');
      });

      afterEach(function () {
        this.sandbox.restore();
      });

      validateBankRedirectStart({
        requiredFields: ['payment_method_type', 'invoice_uuid', 'country_code'],
      });
    });
  });
});

function validateBankRedirectStart ({ requiredFields = [] } = {}) {
  it('raises an error for an invalid type', function (done) {
    this.startPayload.payment_method_type = 'wrong';

    this.bankRedirect.on('error', (error) => {
      assert.ok(error);
      assert.equal(error.code, 'validation');
      assert.equal(error.fields[0], 'invalid payment_method_type');
      done();
    });
    this.bankRedirect.on('token', assert.fail);

    this.bankRedirect.start(this.startPayload);
  });

  for(const requiredField of requiredFields) {
    it(`raises an error for a missing ${requiredField}`, function (done) {
      this.startPayload[requiredField] = '';

      this.bankRedirect.on('error', (error) => {
        assert.ok(error);
        assert.equal(error.code, 'validation');
        assert.equal(error.fields[0], `${requiredField} cannot be blank`);
        done();
      });
      this.bankRedirect.on('token', assert.fail);
      this.bankRedirect.start(this.startPayload);
    });
  }

  it('creates the iframe to make the payment', function () {
    this.bankRedirect.start(this.startPayload);

    assert(this.recurly.Frame.calledOnce);
    assert(this.recurly.Frame.calledWithMatch({
      height: 600,
      path: '/bank_redirect/start',
      payload: this.startPayload
    }));
  });

  it('emit an error if the iframe emits errors', function (done) {
    this.bankRedirect.on('error', (error) => {
      assert.ok(error);
      assert.equal(error.code, 'bank-redirect-error');
      assert.equal(error.cause, 'my-error');
      done();
    });
    this.bankRedirect.on('token', assert.fail);

    const frame = this.bankRedirect.start(this.startPayload);
    frame.emit('error', 'my-error');
  });

  it('emit a token if the iframe is done successfully', function (done) {
    this.bankRedirect.on('error', assert.fail);
    this.bankRedirect.on('token', token => {
      assert(token, 'my-token');
      done();
    });

    const frame = this.bankRedirect.start(this.startPayload);
    frame.emit('done', 'my-token');
  });
}
