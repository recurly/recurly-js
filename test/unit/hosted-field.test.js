import assert from 'assert';
import { applyFixtures } from './support/fixtures';
import {
  initRecurly,
  stubAsMobileDevice,
  stubAsNonMobileDevice
} from './support/helpers';
import { HostedField } from '../../lib/recurly/hosted-field';

describe('Recurly.HostedField', function () {
  applyFixtures();

  this.ctx.fixture = 'minimal';

  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
  });

  describe('when instantiated on a mobile device', function () {
    stubAsMobileDevice();
    beforeEach(buildHostedFieldExample());

    it('injects mobile specific html', function () {
      assert(this.hostedField.tabbingProxy instanceof HTMLElement);
      assert(this.hostedField.tabbingProxy.parentNode === this.hostedField.container);
      assert.strictEqual(typeof this.hostedField.tabbingProxy.focus, 'function');
    });
  });

  describe('when instantiated on a non-mobile device', function () {
    stubAsNonMobileDevice();
    beforeEach(buildHostedFieldExample());

    it('does not inject mobile specific html', function () {
      assert.strictEqual(this.hostedField.tabbingProxy, undefined);
    });
  });

  describe('when configured with a placeholder', function () {
    beforeEach(
      buildHostedFieldExample(
        {
          style: { placeholder: { content: 'placeholder test' }  }
        }
      )
    );

    it('it sets the iframes title attribute with the placeholder content', function () {
      assert.strictEqual(this.hostedField.iframe.getAttribute('title'), 'placeholder test');
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
      selector: '[data-recurly=number]',
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
