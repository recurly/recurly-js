/* eslint-disable no-undef */
import assert from 'assert';
import { fixture, clearFixture } from './support/fixtures';
import { initRecurly, testBed } from './support/helpers';

describe('Recurly.BankRedirect', function () {
  beforeEach(function () {
    this.recurly = initRecurly({ });
    this.bankRedirect = this.recurly.BankRedirect();
  });

  describe('iDeal', function () {
    describe('loadBanks', function () {
      beforeEach(function () {
        this.banksPayload = {
          paymentMethodType: 'ideal',
        };
      });

      afterEach(function () {
        clearFixture();
      });

      it('raises an error for a missing type', function (done) {
        this.banksPayload.paymentMethodType = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'paymentMethodType cannot be blank');
          done();
        });
        this.bankRedirect.on('banks', assert.fail);

        this.bankRedirect.loadBanks(this.banksPayload);
      });

      it('raises an error for an invalid type', function (done) {
        this.banksPayload.paymentMethodType = 'wrong';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invalid paymentMethodType');
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
        fixture('selectBanks');
        const $select = testBed().querySelector('#issuerId');

        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuerId" (id|name)="issuerId">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.banksPayload, '#issuerId');
      });

      it('attach the banks to a select element after cleanup the select', function (done) {
        fixture('selectBanksFull', [{ id: 'bank99', name: 'Bank 99' }]);
        const $select = testBed().querySelector('#issuerId');

        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<select (id|name)="issuerId" (id|name)="issuerId">',
            '<option value="bank1">Bank 1</option>',
            '<option value="bank2">Bank 2</option>',
            '</select>'
          ].join('')).test($select.outerHTML));
          done();
        });

        this.bankRedirect.loadBanks(this.banksPayload, '#issuerId');
      });

      it('attach the banks to a select element into a container', function (done) {
        fixture('emptyForm');
        const $form = testBed().querySelector('#test-form');

        this.bankRedirect.on('error', () => assert.fail);
        this.bankRedirect.on('banks', () => {
          assert.ok(new RegExp([
            '<form id="test-form">',
            '<select (id|name)="issuerId" (id|name)="issuerId">',
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
          paymentMethodType: 'ideal',
          issuerId: 'issuer123',
          invoiceUuid: 'invoice123',
        };

        this.sandbox = sinon.createSandbox();
        this.sandbox.spy(this.recurly, 'Frame');
      });

      afterEach(function () {
        this.sandbox.restore();
      });

      it('raises an error for a missing type', function (done) {
        this.startPayload.paymentMethodType = undefined;

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'paymentMethodType cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      });

      it('raises an error for an invalid type', function (done) {
        this.startPayload.paymentMethodType = 'wrong';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invalid paymentMethodType');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      });

      it('raises an error for a missing issuerId', function (done) {
        this.startPayload.issuerId = '';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'issuerId cannot be blank');
          done();
        });
        this.bankRedirect.on('token', assert.fail);

        this.bankRedirect.start(this.startPayload);
      });

      it('raises an error for a missing invoiceUuid', function (done) {
        this.startPayload.invoiceUuid = '';

        this.bankRedirect.on('error', (error) => {
          assert.ok(error);
          assert.equal(error.code, 'validation');
          assert.equal(error.fields[0], 'invoiceUuid cannot be blank');
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
            paymentMethodType: 'ideal',
            issuerId: 'issuer123'
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
});
