import assert from 'assert';
import bowser from 'bowser';

import {applyFixtures} from './support/fixtures';
import {initRecurly} from './support/helpers';
import {HostedField} from '../lib/recurly/hosted-field';
import {Recurly} from '../lib/recurly';

describe('HostedFields', function () {
  applyFixtures();

  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
  });

  this.ctx.fixture = 'minimal';

  describe('on mobile', function () {
    beforeEach(() => sinon.stub(bowser, 'mobile').value(true));

    beforeEach(buildHostedFieldExample);

    it('injects mobile specific html', function () {
      assert(this.hostedField.tabbingProxy instanceof HTMLElement);
      assert.equal(typeof this.hostedField.tabbingProxy.focus, 'function');
    });
  });

  describe('on non-mobile', function () {
    beforeEach(() => {
      sinon.stub(bowser, 'mobile').value(false);
      sinon.stub(bowser, 'tablet').value(false);
    });

    beforeEach(buildHostedFieldExample);

    it('does not inject mobile specific html', function () {
      assert.strictEqual(this.hostedField.tabbingProxy, undefined);
    });
  });
});

function buildHostedFieldExample () {
  this.hostedField = new HostedField({
    type: 'number',
    selector: `[data-recurly=number]`,
    recurly: this.recurly.config
  });
}
