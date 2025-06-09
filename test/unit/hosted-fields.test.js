import assert from 'assert';
import { applyFixtures } from './support/fixtures';
import { initRecurly, stubAsMobileDevice } from './support/helpers';
import { FIELD_TYPES } from '../../lib/recurly/hosted-fields';

describe('Recurly.HostedFields', function () {
  applyFixtures();

  this.ctx.fixture = 'all';

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();

    recurly.ready(() => {
      this.hostedFields = recurly.hostedFields;
      this.hostedField = recurly.hostedFields.fields[0];
      done();
    });
  });

  describe('initialization', function () {
    it('builds fields collection', function () {
      for (let i = 0; i < this.hostedFields.fields.length; i++) {
        assert(this.hostedFields.fields[i]);
        FIELD_TYPES.forEach(fieldType => {
          if (fieldType == this.hostedFields.fields[i].type)
            assert.equal(fieldType, this.hostedFields.fields[i].type);
        });
      }
    });
  });

  describe('tabbing', function () {
    stubAsMobileDevice();

    beforeEach(function (done) {
      this.sandbox = sinon.createSandbox();
      this.sandbox.spy(this.hostedFields, 'onTab');
      this.sandbox.spy(this.hostedFields, 'tabbableItems');
      this.recurly.ready(() => done());
    });

    afterEach(function () {
      this.sandbox.restore();
    });

    it('binds to specific events', function () {
      const { hostedFields } = this;
      [
        'bus:added',
        'hostedField:state:change',
        'hostedField:tab:next',
        'hostedField:tab:previous'
      ].forEach(event => {
        assert.strictEqual(hostedFields.hasListeners(event), true);
      });
    });

    it('calls onTab when receiving a tab event', function (done) {
      this.recurly.emit('ready');
      this.hostedFields.emit('hostedField:tab:next', { type: this.hostedField.type });
      setTimeout(() => {
        assert.strictEqual(this.hostedFields.onTab.called, true);
        done();
      }, 1);
    });

    it('fetches tabbable elements', function () {
      this.hostedFields.onTab('next', { type: this.hostedField.type });
      assert.strictEqual(this.hostedFields.tabbableItems.called, true);
    });
  });

  describe('fieldConfig', function () {
    describe('format', function () {
      it('prefers the individual field config value', function () {
        const { recurly, hostedFields } = this;
        recurly.configure({
          fields: {
            all: { format: true },
            number: { format: false }
          }
        });

        const fieldConfig = hostedFields.fieldConfig('number');
        assert.strictEqual(fieldConfig.format, false);
      });

      it('falls back to the general config value', function () {
        const { recurly, hostedFields } = this;
        recurly.configure({
          fields: {
            all: { format: true }
          }
        });

        const fieldConfig = hostedFields.fieldConfig('number');
        assert.strictEqual(fieldConfig.format, true);
      });
    });

    describe('tabIndex', function () {
      it('prefers the general field config value', function () {
        const { recurly, hostedFields } = this;
        recurly.configure({
          fields: {
            all: { tabIndex: 0 },
            number: { tabIndex: 200 }
          }
        });

        const fieldConfig = hostedFields.fieldConfig('number');
        assert.strictEqual(fieldConfig.tabIndex, 0);
      });

      it('falls back to the individual config value', function () {
        const { recurly, hostedFields } = this;
        recurly.configure({
          fields: {
            number: { tabIndex: 200 }
          }
        });

        const fieldConfig = hostedFields.fieldConfig('number');
        assert.strictEqual(fieldConfig.tabIndex, 200);
      });
    });
  });
});
