import assert from 'assert';
import {applyFixtures} from './support/fixtures';
import {initRecurly, stubAsMobileDevice} from './support/helpers';
import HostedField from '../lib/recurly/hosted-field';
import {FIELD_TYPES, HostedFields} from '../lib/recurly/hosted-fields';
import {Recurly} from '../lib/recurly';

describe('Recurly.HostedFields', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.hostedFields = new HostedFields({ recurly: this.recurly.config });
    this.hostedField = this.hostedFields.fields[0];
  });

  applyFixtures();

  describe('initialization', function () {
    this.ctx.fixture = 'all';

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
      this.recurly = initRecurly();
      this.hostedFields = new HostedFields({ recurly: this.recurly.config });
      this.hostedField = this.hostedFields.fields[0];
      sinon.spy(this.hostedFields, 'onTab');
      sinon.spy(this.hostedFields, 'tabbableItems');
      this.recurly.ready(done);
    });

    afterEach(function () {
      this.hostedFields.onTab.restore();
      this.hostedFields.tabbableItems.restore();
    });

    this.ctx.fixture = 'all';

    it('binds to specific events', function () {
      [
        'bus:added',
        'hostedField:state:change',
        'hostedField:tab:next',
        'hostedField:tab:previous'
      ].forEach(event => {
        assert.strictEqual(this.hostedFields.hasListeners(event), true);
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
});
