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
        this.banksPayload = {
          payment_method_type: 'ideal',
        };
      });

      afterEach(function () {
        clearFixture();
      });

      it('raises an error for a missing type', function (done) {
        this.banksPayload.payment_method_type = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'payment_method_type cannot be blank');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.banksPayload);
      });

      it('raises an error for an invalid type', function (done) {
        this.banksPayload.payment_method_type = 'wrong';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invalid payment_method_type');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.banksPayload);
      });

      it('raises an error for a failed api request', function (done) {
        this.banksPayload.error = true;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'banks-error');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.banksPayload);
      });

      it('emit the banks without error for a successfully api request', function (done) {
        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', banks => {
          assert.ok(banks);
          done();
        });

        this.bankRedirect.loadBanks(this.banksPayload);
      });

      it('attach the banks to a select element', function (done) {
        fixture('selectLists', 'issuer_id');
        const $select = testBed().querySelector('#issuer_id');

        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuer_id" (id|name)="issuer_id">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.banksPayload, '#issuer_id');
      });

      it('attach the banks to a select element after cleanup the select', function (done) {
        fixture('selectListsFull', [{ id: 'bank99', name: 'Bank 99' }], 'issuer_id');
        const $select = testBed().querySelector('#issuer_id');

        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuer_id" (id|name)="issuer_id">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.banksPayload, '#issuer_id');
      });

      it('attach the banks to a select element into a container', function (done) {
        fixture('emptyForm');
        const $form = testBed().querySelector('#test-form');

        this.bankRedirect.on('error', () => assert.fail);
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

        this.bankRedirect.loadBanks(this.banksPayload, '#test-form');
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

      it('raises an error for a missing type', function (done) {
        this.startPayload.payment_method_type = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'payment_method_type cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      });

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

      it('raises an error for a missing issuer_id', function (done) {
        this.startPayload.issuer_id = '';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'issuer_id cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      });

      it('raises an error for a missing invoice_uuid', function (done) {
        this.startPayload.invoice_uuid = '';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invoice_uuid cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);
        this.bankRedirect.start(this.startPayload);
      });

      it('create the iframe to make the payment', function () {
        // debugger
        this.bankRedirect.start(this.startPayload);

        assert(this.recurly.Frame.calledOnce);
        assert(this.recurly.Frame.calledWithMatch({
          height: 600,
          path: '/bank_redirect/start',
          payload: {
            payment_method_type: 'ideal',
            issuer_id: 'issuer123'
          }
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
    });
  });

  describe('sofort', function () {
    describe('loadCountries', function () {
      it('emits the countries without error for a successful api request', function (done) {
        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('countries', countries => {
          assert.ok(countries);
          done();
        });

        this.bankRedirect.loadCountries();
      });

      it('attach the countries to a select element', function (done) {
        fixture('selectLists', 'country_code');
        const $select = testBed().querySelector('#country_code');

        this.bankRedirect.on('error', () => assert.fail);
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

        this.bankRedirect.loadCountries('#country_code');
      })

      it('attach the countries to a select element after cleanup the select', function (done) {
        const list = [
          { name: "Austria", id: "AT" },
          { name: "Belgium", id: "BE" },
          { name: "Germany", id: "DE" },
          { name: "Italy", id: "IT" },
          { name: "Spain", id: "ES" },
          { name: "The Netherlands", id: "NL" }
        ]
        fixture('selectListsFull', list, 'country_code');
        const $select = testBed().querySelector('#country_code');

        this.bankRedirect.on('error', () => assert.fail);
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

        this.bankRedirect.loadCountries('#country_code');
      })

      it('attach the countries to a select element into a container', function (done) {
        fixture('emptyForm');
        const $form = testBed().querySelector('#test-form');

        this.bankRedirect.on('error', () => assert.fail);
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
        this.bankRedirect.loadCountries('#test-form');
      })
    })

    describe('start', function() {
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

      it('raises an error when country_code is missing', function (done) {
        this.startPayload.country_code = '';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'country_code cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      })

      it('creates the iframe to make the payment', function () {
        this.bankRedirect.start(this.startPayload);

        assert(this.recurly.Frame.calledOnce);
        assert(this.recurly.Frame.calledWithMatch({
          height: 600,
          path: '/bank_redirect/start',
          payload: {
            payment_method_type: 'sofort',
            country_code: 'NA'
          }
        }));
      })
    })
  })
});
