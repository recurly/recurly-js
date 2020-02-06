import assert from 'assert';
import { Recurly } from '../lib/recurly';
import { applyFixtures } from './support/fixtures';
import { initRecurly, testBed } from './support/helpers';

describe('Recurly.fraud', function () {
  const kountConfiguration = {
    kount: {
      dataCollector: true
    }
  };

  applyFixtures();

  this.ctx.fixture = 'emptyForm';

  describe('when configured to use the kount data collector', function () {
    describe('when the site does not support kount data collection', function () {
      it('emits an error on recurly', function (done) {
        const recurly = initRecurly({
          publicKey: 'test-site-without-kount',
          fraud: { ...kountConfiguration }
        });

        recurly.on('error', function (err) {
          assert.strictEqual(err.code, 'fraud-data-collector-request-failed');
          assert.strictEqual(err.error.code, 'feature-not-enabled');
          assert.strictEqual(err.error.message, 'Fraud detection feature is not enabled for this site');
          done();
        });
      })
    });

    describe('when the site supports kount data collection', function () {
      it('creates a data collector using the Kount SDK', function (done) {
        const form = testBed().querySelector('#test-form');
        assert.strictEqual(form.children.length, 0);

        const recurly = initRecurly({
          fraud: {
            kount: { ...kountConfiguration.kount, form }
          }
        });

        recurly.fraud.on('ready', () => {
          assert.strictEqual(form.children.length, 3);
          assert.strictEqual(form.children[0].getAttribute('data-recurly'), 'fraud_session_id');
          assert.strictEqual(form.children[1].getAttribute('src'), '/api/mock-200');
          assert.strictEqual(form.children[2].className, 'kaxsdc');
          done();
        });
      });

      it('emits an error when the Kount SDK encounters an error', function (done) {
        const form = testBed().querySelector('#test-form');
        assert.strictEqual(form.children.length, 0);

        const recurly = initRecurly({
          fraud: {
            kount: { ...kountConfiguration.kount, form }
          }
        });

        recurly.on('error', err => {
          assert.strictEqual(err.code, 'fraud-data-collector-request-failed');
          assert.strictEqual(err.error, 'Kount SDK failed to load.');
          done();
        });

        // mock kount SDK load
        recurly.fraud.on('ready', () => testBed().querySelector('script').onload());
      });

      describe('when no form is provided', function () {
        this.ctx.fixture = 'minimal';

        it('uses a form occupied by any recurly.hostedFields', function (done) {
          const form = testBed().querySelector('#test-form');
          const recurly = initRecurly({
            fraud: { ...kountConfiguration }
          });

          recurly.fraud.on('ready', () => {
            assert(form.querySelector('input[data-recurly=fraud_session_id]'));
            assert(form.querySelector('script[src="/api/mock-200"]'));
            assert(form.querySelector('div[class=kaxsdc]'));
            done();
          });
        });

        describe('when no form occupied by recurly.hostedFields exists', function () {
          this.ctx.fixture = 'empty';

          it('emits an error', function (done) {
            const recurly = initRecurly({
              fraud: { ...kountConfiguration }
            });

            recurly.on('error', err => {
              assert.strictEqual(err.code, 'fraud-data-collector-missing-form');
              done();
            });
          });
        });
      });
    });
  });

  describe('#destroy', function () {
    it('removes attached collector nodes', function (done) {
      const form = testBed().querySelector('#test-form');

      const recurly = initRecurly({
        fraud: {
          kount: { ...kountConfiguration.kount, form }
        }
      });

      recurly.fraud.on('ready', () => {
        assert.strictEqual(form.children.length, 3);
        recurly.fraud.destroy();
        assert.strictEqual(form.children.length, 0);
        done();
      });
    });
  });
});
