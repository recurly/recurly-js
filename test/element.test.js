import { applyFixtures } from './support/fixtures';
import assert from 'assert';
import Element from '../lib/recurly/element';
import Elements from '../lib/recurly/elements';
import { factory as cardElementFactory } from '../lib/recurly/element/card-element';
import { factory as numberElementFactory } from '../lib/recurly/element/number-element';
import { factory as monthElementFactory } from '../lib/recurly/element/month-element';
import { factory as yearElementFactory } from '../lib/recurly/element/year-element';
import { factory as cvvElementFactory } from '../lib/recurly/element/cvv-element';
import { initRecurly } from './support/helpers';
import { Recurly } from '../lib/recurly';

describe('Element', function () {
  class ElementsStub extends Elements {
    add = () => {}
  }

  applyFixtures();

  this.ctx.fixture = 'elements';

  beforeEach(function () {
    let recurly = this.recurly = initRecurly();
    const elements = this.elements = new ElementsStub({ recurly });
    const validOptions = this.validOptions = {
      elements,
      displayIcon: true,
      inputType: 'select',
      style: {
        fontSize: '20px'
      },
      tabIndex: 100
    };
    this.element = new Element(validOptions);
    this.validParentElement = document.querySelector('#recurly-elements');
  });

  it('requires an elements instance', function () {
    const { elements } = this;
    assert.throws(() => new Element());
    assert.doesNotThrow(() => new Element({ elements }))
  });

  it('accepts options according to a whitelist', function () {
    const element = new Element(Object.assign({}, this.validOptions, {
      invalidOption: 'test'
    }));

    assert.strictEqual(element.config.displayIcon, this.validOptions.displayIcon);
    assert.strictEqual(element.config.inputType, this.validOptions.inputType);
    assert.deepEqual(element.config.style, this.validOptions.style);
    assert.strictEqual(element.config.tabIndex, this.validOptions.tabIndex);
    assert.strictEqual(element.config.invalidOption, undefined);
  });

  describe('Element.attach', function () {
    it('only accepts an HTMLElement', function (done) {
      const invalidExamples = [
        undefined,
        null,
        true,
        0,
        '#my-element',
        document.querySelector('#my-nonexistent-element')
      ];

      invalidExamples.forEach(invalidExample => {
        assert.throws(() => {
          this.element.attach(invalidExample);
        }, 'Invalid parent. Expected HTMLElement.');
      });

      this.element.once('attach', () => done());
      this.element.attach(this.validParentElement);
    });

    it('attaches the element.container to the DOM', function (done) {
      assertElementNotAttachedTo(this.validParentElement);
      this.element.attach(this.validParentElement);
      this.element.once('attach', () => {
        assertElementAttachedTo(this.element, this.validParentElement);
        done();
      });
    });

    it('adds the iframe window to the bus', function (done) {
      this.element.attach(this.validParentElement);
      this.element.once('attach', () => {
        assert(~this.element.bus.recipients.indexOf(this.element.window));
        done();
      });
    });

    it(`emits the 'attach' event`, function (done) {
      this.element.on('attach', element => {
        assert.strictEqual(element, this.element);
        done();
      });
      this.element.attach(this.validParentElement);
    });

    describe('when the element is already attached', function () {
      beforeEach(function (done) {
        this.element.attach(this.validParentElement);
        this.element.once('attach', () => done());
      });

      describe('to the same parent', function () {
        it('does nothing', function () {
          sinon.spy(this.element, 'emit');
          assertElementAttachedTo(this.element, this.validParentElement);
          this.element.attach(this.validParentElement);
          assertElementAttachedTo(this.element, this.validParentElement);
          assert(this.element.emit.notCalled);
          this.element.emit.restore();
        });
      });

      describe('to a different parent', function () {
        beforeEach(function () {
          this.validParentElementTwo = document.querySelector('#recurly-elements-two');
        });

        it(`removes the element from the previous parent
            and attaches is to the new parent`, function (done) {
          assertElementAttachedTo(this.element, this.validParentElement);
          this.element.attach(this.validParentElementTwo);
          this.element.once('attach', () => {
            assertElementNotAttachedTo(this.validParentElement);
            assertElementAttachedTo(this.element, this.validParentElementTwo);
            done();
          });
        });
      });
    });
  });

  describe('Element.remove', function () {
    beforeEach(function () {
      sinon.spy(this.validParentElement, 'removeChild');
    });

    afterEach(function () {
      this.validParentElement.removeChild.restore();
    });

    describe('when the element is attached', function () {
      beforeEach(function (done) {
        this.element.on('attach', () => done());
        this.element.attach(this.validParentElement);
      });

      it('removes the element from the DOM', function () {
        assertElementAttachedTo(this.element, this.validParentElement);
        this.element.remove();
        assertElementNotAttachedTo(this.validParentElement);
        assert(this.validParentElement.removeChild.calledOnceWithExactly(this.element.container));
      });

      it('removes the iframe window from the bus', function () {
        assert(!!~this.element.bus.recipients.indexOf(this.element.window));
        this.element.remove();
        assert(!~this.element.bus.recipients.indexOf(this.element.window));
      });

      it(`emits the 'remove' event`, function (done) {
        this.element.on('remove', element => {
          assert.strictEqual(element, this.element);
          done();
        });
        this.element.remove();
      });
    });

    describe('when the element is not attached', function () {
      it('does nothing', function () {
        sinon.spy(this.element, 'emit');
        this.element.remove();
        assert(this.validParentElement.removeChild.notCalled);
        assert(this.element.emit.notCalled);
        this.element.emit.restore();
      });
    });
  });

  describe('Element.destroy', function () {
    beforeEach(function (done) {
      this.element.on('attach', () => done());
      this.element.attach(this.validParentElement);
    });

    it('removes the element from the DOM', function () {
      assertElementAttachedTo(this.element, this.validParentElement);
      this.element.destroy();
      assertElementNotAttachedTo(this.validParentElement);
    });

    it('removes event listeners', function () {
      const listener = sinon.stub();
      this.element.on('test-event', listener);
      this.element.destroy();
      this.element.emit('test-event');
      assert(listener.notCalled);
    });

    it('removes itself from the bus', function () {
      assert(!!~this.element.bus.recipients.indexOf(this.element));
      this.element.destroy();
      assert(!~this.element.bus.recipients.indexOf(this.element));
    });
  });

  describe('Element.configure', function () {

  });

  describe('Element.config', function () {

  });

  describe('Element.container', function () {

  });

  describe('Element.iframe', function () {

  });

  describe('Element.window', function () {

  });

  describe('Element.attached', function () {

  });

  describe('Element.url', function () {

  });

  describe(`Event: 'focus'`, function () {

  });

  describe(`Event: 'blur'`, function () {

  });

  describe(`Event: 'submit'`, function () {

  });
});

function assertElementAttachedTo (element, parent) {
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(parent.children[0], element.container);
  assert(parent.contains(element.iframe));
}

function assertElementNotAttachedTo (parent) {
  assert.strictEqual(parent.children.length, 0);
}
