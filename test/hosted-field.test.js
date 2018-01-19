import assert from 'assert';
import bowser from 'bowser';

import {applyFixtures} from './support/fixtures';
import {initRecurly} from './support/helpers';
import {HostedField} from '../lib/recurly/hosted-field';
import {Recurly} from '../lib/recurly';

describe('HostedFields', function () {
  beforeEach(function (done) {
    this.fieldType = 'number';
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.fieldConfig = {
      type: this.fieldType,
      selector: `[data-recurly=${this.fieldType}]`,
      recurly: this.recurly.config
    };
    sinon.stub(bowser, 'mobile').value(true);
    this.hostedField = new HostedField(this.fieldConfig);
  });

  applyFixtures();

  describe('on mobile', function () {
    this.ctx.fixture = 'minimal';

    it('injects mobile specific html', function () {
      assert(this.hostedField.tabbingProxy);
      assert.equal('function', typeof this.hostedField.tabbingProxy.focus);
    });
  });
});

describe('HostedFields', function () {
  beforeEach(function (done) {
    this.fieldType = 'number';
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.fieldConfig = {
      type: this.fieldType,
      selector: `[data-recurly=${this.fieldType}]`,
      recurly: this.recurly.config
    };
    sinon.stub(bowser, 'mobile').value(false);
    sinon.stub(bowser, 'tablet').value(false);
    this.hostedField = new HostedField(this.fieldConfig);
  });

  applyFixtures();

  describe('on non-mobile', function () {
    this.ctx.fixture = 'minimal';

    it('does not inject mobile specific html', function () {
      assert.equal(null, this.hostedField.tabbingProxy);
    });
  });
});
