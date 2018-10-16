import assert from 'assert';
import {applyFixtures} from './support/fixtures';
import {initRecurly, nextTick} from './support/helpers';
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
    beforeEach(function (done) {
      this.recurly = initRecurly();
      this.recurly.ready(done);
      this.hostedFields = new HostedFields({ recurly: this.recurly.config });
      this.hostedField = this.hostedFields.fields[0];
    });

    this.ctx.fixture = 'all';

    it('binds to specific events', function () {
      const events = [
        'bus:added',
        'hostedField:state:change',
        'hostedField:tab:next',
        'hostedField:tab:previous'
      ];

      events.forEach((event) => {
        assert(this.hostedFields.hasListeners(event));
      });
    });

    it('calls bound function', function () {
      sinon.spy(this.hostedFields, "onTab");
      this.recurly.emit('ready');

      this.hostedFields.emit('hostedField:tab:previous', {
        type: this.hostedField.type
      });

      nextTick(function () {
        assert(this.hostedFields.onTab.called);
      });
    });

    it('fetches tabbable elements', function () {
      sinon.spy(this.hostedFields, "tabbableItems");

      this.hostedFields.onTab('previous', {
        type: this.hostedField.type
      });

      nextTick(function () {
        assert(this.hostedFields.tabbableItems.called);
      });
    });
  });
});
