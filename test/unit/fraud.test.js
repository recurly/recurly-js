import assert from 'assert';
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
      });
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

      describe('with more than one payment form', function () {
        this.ctx.fixture = 'multipleEmptyForms';

        it('creates a data collector repeatedly', function (done) {
          let recurly = null;

          const firstForm = () => {
            const form = testBed().querySelector('#test-form-1');
            assert.strictEqual(form.children.length, 0);

            recurly = initRecurly({
              fraud: {
                kount: { ...kountConfiguration.kount, form }
              }
            });

            recurly.fraud.once('ready', () => {
              assert.strictEqual(form.children.length, 3, 'test form 1 should have Kount elements');
              assert.strictEqual(form.children[0].getAttribute('data-recurly'), 'fraud_session_id');
              assert.strictEqual(form.children[1].getAttribute('src'), '/api/mock-200');
              assert.strictEqual(form.children[2].className, 'kaxsdc');
              secondForm();
            });
          };

          const secondForm = () => {
            const form = testBed().querySelector('#test-form-2');
            assert.strictEqual(form.children.length, 0);

            // on the second pass, we need to set up additional checks BEFORE
            // calling recurly.configuration, because recurly.fraud already
            // exists
            recurly.fraud.once('ready', () => {
              assert.strictEqual(form.children.length, 3, 'test form 2 should have Kount elements');
              assert.strictEqual(form.children[0].getAttribute('data-recurly'), 'fraud_session_id');
              assert.strictEqual(form.children[1].getAttribute('src'), '/api/mock-200');
              assert.strictEqual(form.children[2].className, 'kaxsdc');
              done();
            });

            initRecurly(recurly, {
              fraud: {
                kount: { ...kountConfiguration.kount, form }
              }
            });

          };

          firstForm();
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
            assert(form.querySelector('input[data-recurly=fraud_session_id][type=hidden]'));
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

  describe('when configured to use the fraudnet data collector', function () {
    it('creates a data collector using the Fraudnet SDK', function (done) {
      const recurly = initRecurly({
        publicKey: 'test-site-with-fraudnet-only',
      });

      recurly.fraud.on('ready', () => {
        const iframe = document.querySelector('#fraudnet-iframe');
        assert.ok(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        const paramsScript = iframeDoc.querySelector('script#fraudnet-params');
        assert.ok(paramsScript);
        assert.strictEqual(paramsScript.getAttribute('fncls'), 'fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99');
        const jsonContent = JSON.parse(paramsScript.textContent);
        assert.strictEqual(jsonContent.f, '69e62735a65c012f5ef31b4efcad2e90');
        assert.strictEqual(jsonContent.s, 'KJH4G352J34HG5_checkout');
        assert.strictEqual(jsonContent.sandbox, true);

        const fraudnetScript = iframeDoc.querySelector('script#fraudnet-script');
        assert.ok(fraudnetScript);
        assert.strictEqual(fraudnetScript.getAttribute('src'), '/api/mock-200');

        recurly.destroy();
        done();
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

  describe('#params', function () {
    it('gets the fraud params presented for kount', function () {
      const recurly = initRecurly({
        fraud: {
          kount: {
            dataCollector: true,
            form: testBed().querySelector('#test-form'),
            udf: {
              UDF_1: 'VALUE_1',
              UDF_2: 'VALUE_2',
            }
          }
        }
      });
      const params = recurly.fraud.params({ fraud_session_id: 'FRAUD_123' });

      assert.deepEqual(params, [{
        processor: 'kount',
        session_id: 'FRAUD_123',
        udf: [
          { label: 'UDF_1', value: 'VALUE_1' },
          { label: 'UDF_2', value: 'VALUE_2' },
        ]
      }]);
    });

    it('gets the fraud params presented for fraudnet', function (done) {
      const recurly = initRecurly({
        publicKey: 'test-site-with-fraudnet-only',
      });

      recurly.fraud.on('ready', () => {
        const params = recurly.fraud.params();
        assert.deepEqual(params, [{
          processor: 'fraudnet',
          session_id: '69e62735a65c012f5ef31b4efcad2e90',
        }]);
        recurly.destroy();
        done();
      });
    });
  });
});
