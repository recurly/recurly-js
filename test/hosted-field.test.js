import assert from 'assert';
import bowser from 'bowser';
import {applyFixtures} from './support/fixtures';
import {initRecurly} from './support/helpers';
import {HostedField} from '../lib/recurly/hosted-field';
import {Recurly} from '../lib/recurly';

describe('Recurly.HostedField', function () {
  applyFixtures();

  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
  });

  this.ctx.fixture = 'minimal';

  describe('when instantiated on a mobile device', function () {
    beforeEach(function () {
      this.sandbox = sinon.createSandbox();
      if (bowser.mobile === true) return;
      if (!bowser.hasOwnProperty('mobile')) bowser.mobile = undefined;
      this.sandbox.stub(bowser, 'mobile').value(true);
    });
    beforeEach(buildHostedFieldExample());
    afterEach(function () {
      this.sandbox.restore();
    });

    it('injects mobile specific html', function () {
      assert(this.hostedField.tabbingProxy instanceof HTMLElement);
      assert(this.hostedField.tabbingProxy.parentNode === this.hostedField.container);
      assert.strictEqual(typeof this.hostedField.tabbingProxy.focus, 'function');
    });
  });

  describe('when instantiated on a non-mobile device', function () {
    beforeEach(function () {
      this.sandbox = sinon.createSandbox();
      if ('mobile' in bowser) this.sandbox.stub(bowser, 'mobile').value(false);
      if ('tablet' in bowser) this.sandbox.stub(bowser, 'tablet').value(false);
    });
    beforeEach(buildHostedFieldExample());
    afterEach(function () {
      this.sandbox.restore()
    });

    it('does not inject mobile specific html', function () {
      assert.strictEqual(this.hostedField.tabbingProxy, undefined);
    });
  });

  describe('when configured with a tabIndex', function () {
    describe('when set to -1', function () {
      beforeEach(buildHostedFieldExample({ tabIndex: -1 }));
      it('sets the iframe tabIndex to -1', function () {
        assert.strictEqual(this.hostedField.iframe.tabIndex, -1);
      });
    });

    describe('when set to zero', function () {
      beforeEach(buildHostedFieldExample({ tabIndex: 0 }));
      it('sets the iframe tabIndex to zero', function () {
        assert.strictEqual(this.hostedField.iframe.tabIndex, 0);
      });
    });

    describe('when set to a positive integer', function () {
      beforeEach(buildHostedFieldExample({ tabIndex: 1000 }));
      it('sets the iframe tabIndex accordingly', function () {
        assert.strictEqual(this.hostedField.iframe.tabIndex, 1000);
      });
    });

    describe('when set to an invalid value', function () {
      beforeEach(buildHostedFieldExample({ tabIndex: 'not an integer' }));
      it('does not set the tabIndex', function () {
        assert.strictEqual(this.hostedField.iframe.tabIndex, 0);
      });
    });
  });
});

function buildHostedFieldExample (opts = {}) {
  return function (done) {
    this.hostedField = new HostedField(Object.assign({}, {
      type: 'number',
      selector: `[data-recurly=number]`,
      recurly: this.recurly.config
    }, opts));
    this.hostedField.emit('hostedField:ready', { type: 'number' });
    const pollId = setInterval(() => {
      if (!this.hostedField.ready) return;
      clearInterval(pollId);
      done();
    }, 50);
  };
}
