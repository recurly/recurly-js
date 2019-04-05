import after from 'lodash.after';
import { applyFixtures } from './support/fixtures';
import assert from 'assert';
import clone from 'component-clone';
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
    const recurly = this.recurly = initRecurly();
    const elements = this.elements = new ElementsStub({ recurly });
    const validConfig = this.validConfig = {
      displayIcon: true,
      inputType: 'select',
      style: {
        fontSize: '20px'
      },
      tabIndex: 100
    };
    const validOptions = this.validOptions = {
      elements,
      ...validConfig
    }
    const element = this.element = new Element(validOptions);
    this.validParentElement = document.querySelector('#recurly-elements');

    // These simulate messages an element expects to receive from a frame
    this.messageName = name => `element:${element.id}:${name}`
    this.sendMessage = name => element.bus.send(this.messageName(name));
  });

  it('requires an elements instance', function () {
    const { elements } = this;
    assert.throws(() => new Element());
    assert.doesNotThrow(() => new Element({ elements }))
  });

  it('configures the instance', function () {
    const { element, validOptions } = this;
    assert.strictEqual(element.config.displayIcon, validOptions.displayIcon);
    assert.strictEqual(element.config.inputType, validOptions.inputType);
    assert.strictEqual(element.config.tabIndex, validOptions.tabIndex);
    assert.deepEqual(element.config.style, validOptions.style);
  });

  describe('Element.attach', function () {
    it('only accepts an HTMLElement', function (done) {
      const { element, validParentElement } = this;
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
          element.attach(invalidExample);
        }, 'Invalid parent. Expected HTMLElement.');
      });

      element.once('attach', () => done());
      element.attach(validParentElement);
    });

    it('returns the instance', function (done) {
      const { element, validParentElement } = this;
      element.on('attach', () => done());
      assert.strictEqual(element.attach(validParentElement), element);
    });

    it('attaches the element.container to the DOM', function (done) {
      const { element, validParentElement } = this;
      assertElementNotAttachedTo(validParentElement);
      element.attach(validParentElement);
      element.once('attach', () => {
        assertElementAttachedTo(element, validParentElement);
        done();
      });
    });

    it('adds the iframe window to the bus', function (done) {
      const { element, validParentElement } = this;
      element.attach(validParentElement);
      element.once('attach', () => {
        assert(~element.bus.recipients.indexOf(element.window));
        done();
      });
    });

    it(`emits the 'attach' event`, function (done) {
      const { element, validParentElement } = this;
      element.once('attach', element => {
        assert.strictEqual(element, element);
        done();
      });
      element.attach(validParentElement);
    });

    describe('when the element is already attached', function () {
      attachElement();

      describe('to the same parent', function () {
        it('does nothing', function () {
          const { element, validParentElement } = this;
          sinon.spy(element, 'emit');
          assertElementAttachedTo(element, validParentElement);
          element.attach(validParentElement);
          assertElementAttachedTo(element, validParentElement);
          assert(element.emit.notCalled);
        });

        it('returns the instance', function () {
          const { element, validParentElement } = this;
          const attachSpy = sinon.spy(() => element.attach(validParentElement));
          element.on('attach', () => {
            assert(attachSpy.calledTwice);
            done();
          });
          assert.strictEqual(attachSpy(), element);
          assert.strictEqual(attachSpy(), element);
        });
      });

      describe('to a different parent', function () {
        beforeEach(function () {
          this.validParentElementTwo = document.querySelector('#recurly-elements-two');
        });

        it(`removes the element from the previous parent
            and attaches is to the new parent`, function (done) {
          const { element, validParentElement, validParentElementTwo } = this;
          assertElementAttachedTo(element, validParentElement);
          element.attach(validParentElementTwo);
          element.once('attach', () => {
            assertElementNotAttachedTo(validParentElement);
            assertElementAttachedTo(element, validParentElementTwo);
            done();
          });
        });

        it('returns the instance', function (done) {
          const { element, validParentElement, validParentElementTwo } = this;
          const attachSpy = sinon.spy(el => element.attach(el));
          element.on('attach', () => {
            assert(attachSpy.calledTwice);
            done();
          });
          assert.strictEqual(attachSpy(validParentElement), element);
          assert.strictEqual(attachSpy(validParentElementTwo), element);
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
      attachElement();

      it('removes the element from the DOM', function () {
        const { element, validParentElement } = this;
        assertElementAttachedTo(element, validParentElement);
        element.remove();
        assertElementNotAttachedTo(validParentElement);
        assert(validParentElement.removeChild.calledOnceWithExactly(element.container));
      });

      it('removes the iframe window from the bus', function () {
        const { element } = this;
        assert(!!~element.bus.recipients.indexOf(element.window));
        element.remove();
        assert(!~element.bus.recipients.indexOf(element.window));
      });

      it(`removes any dangling 'ready' message listeners`, function () {
        const { element, messageName, sendMessage } = this;
        const listener = sinon.stub();
        element.on(messageName('ready'), listener);
        element.remove();
        sendMessage('ready');
        assert(listener.notCalled);
      });

      it(`emits the 'remove' event`, function (done) {
        const { element } = this;
        element.once('remove', element => {
          assert.strictEqual(element, element);
          done();
        });
        element.remove();
      });

      it('returns the instance', function () {
        const { element } = this;
        assert.strictEqual(element.remove(), element);
      });
    });

    describe('when the element is not attached', function () {
      it('does nothing', function () {
        const { element, validParentElement } = this;
        sinon.spy(element, 'emit');
        element.remove();
        assert(validParentElement.removeChild.notCalled);
        assert(element.emit.notCalled);
      });

      it('returns the instance', function () {
        const { element } = this;
        assert.strictEqual(element.remove(), element);
      });
    });
  });

  describe('Element.destroy', function () {
    attachElement();

    it('removes the element from the DOM', function () {
      const { element, validParentElement } = this;
      assertElementAttachedTo(element, validParentElement);
      element.destroy();
      assertElementNotAttachedTo(validParentElement);
    });

    it('removes event listeners', function () {
      const { element } = this;
      const listener = sinon.stub();
      element.once('test-event', listener);
      element.destroy();
      element.emit('test-event');
      assert(listener.notCalled);
    });

    it('removes itself from the bus', function () {
      const { element } = this;
      assert(!!~element.bus.recipients.indexOf(element));
      element.destroy();
      assert(!~element.bus.recipients.indexOf(element));
    });

    it('returns the instance', function () {
      const { element } = this;
      assert.strictEqual(element.destroy(), element);
    });
  });

  describe('Element.configure', function () {
    beforeEach(function () {
      sinon.spy(this.element, 'update');
    });

    afterEach(function () {
      this.element.update.restore();
    });

    it('sets config according to a whitelist', function () {
      const { element, validOptions } = this;
      element.configure(Object.assign({}, validOptions, {
        invalidOption: 'test'
      }));
      assert.strictEqual(element.config.displayIcon, validOptions.displayIcon);
      assert.strictEqual(element.config.inputType, validOptions.inputType);
      assert.strictEqual(element.config.tabIndex, validOptions.tabIndex);
      assert.deepEqual(element.config.style, validOptions.style);
      assert(!('invalidOption' in element.config));
    });

    describe('when equivalent options are given', function () {
      beforeEach(function () {
        this.example = clone(this.validConfig);
      });

      it('does not change config when it is equivalent to existing config', function () {
        const { element, example } = this;
        const config = element._config;
        element.configure(example);
        assert.deepEqual(config, element._config);
        assert(element.update.notCalled);
      });

      it('returns the instance', function () {
        const { element, example } = this;
        assert.strictEqual(element.configure(example), element);
      });
    });


    describe('when unequivalent options are given', function () {
      beforeEach(function () {
        this.example = {
          displayIcon: false,
          style: {
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px'
          },
          tabIndex: undefined
        };
      });

      it('changes config ', function () {
        const { element, validConfig, example } = this;
        element.configure(example);
        assert.strictEqual(element.config.displayIcon, example.displayIcon);
        assert.strictEqual(element.config.inputType, validConfig.inputType);
        assert.strictEqual(element.config.tabIndex, undefined);
        assert.deepEqual(element.config.style, example.style);
      });

      it('calls update', function () {
        const { element, example } = this;
        element.configure(example);
        assert(element.update.calledOnce);
      });

      it('returns the instance', function () {
        const { element, example } = this;
        assert.strictEqual(element.configure(example), element);
      });
    });
  });

  describe('Element.focus', function () {
    it(`sends the 'focus!' message`, function () {
      const { element, messageName } = this;
      sinon.spy(element.bus, 'send');
      element.focus();
      assert(element.bus.send.calledOnceWithExactly(messageName('focus!')));
      element.bus.send.restore();
    });
  });

  describe('Element.config', function () {
    it('returns an object containing all current config and additional attributes', function () {
      const { element, recurly, validConfig } = this;
      assert.deepEqual(this.element.config, {
        ...validConfig,
        busGroupId: element.bus.groupId,
        deviceId: recurly.deviceId,
        elementId: element.id,
        recurly: recurly.config,
        sessionId: recurly.sessionId,
        type: element.type
      });
    });
  });

  describe('Element.container', function () {
    it('returns an HTMLDivElement', function () {
      assert(this.element.container instanceof HTMLDivElement);
    });

    it('memoizes its value', function () {
      const example = this.container;
      assert.strictEqual(this.container, example);
    });

    it('has a className matching the element.classList', function () {
      const { element } = this;
      assert.strictEqual(element.container.className, element.classList);
    });

    it('contains element.tabProxy and element.iframe as its sole children', function () {
      const { element } = this;
      const { children } = element.container;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0], element.tabProxy);
      assert.strictEqual(children[1], element.iframe);
    });
  });

  describe('Element.tabProxy', function () {
    it('returns a hidden HTMLInputElement', function () {
      assert(this.element.tabProxy instanceof HTMLInputElement);
    });

    it('memoizes its value', function () {
      const example = this.tabProxy;
      assert.strictEqual(this.tabProxy, example);
    });

    it('calls element.focus when it receives the focus event', function () {
      const { element } = this;
      const { tabProxy } = element;
      const example = new CustomEvent('focus');
      sinon.spy(element, 'focus');
      tabProxy.dispatchEvent(example);
      element.focus.restore();
    });
  });

  describe('Element.iframe', function () {
    it('returns an HTMLIFrameElement', function () {
      assert(this.element.iframe instanceof HTMLIFrameElement);
    });

    it('memoizes its value', function () {
      const example = this.iframe;
      assert.strictEqual(this.iframe, example);
    });

    it('assigns attributes', function () {
      const { iframe, id, url } = this.element;
      assert.strictEqual(iframe.getAttribute('allowtransparency'), 'true');
      assert.strictEqual(iframe.getAttribute('frameborder'), '0');
      assert.strictEqual(iframe.getAttribute('scrolling'), 'no');
      assert.strictEqual(iframe.getAttribute('name'), `recurly-element--${id}`);
      assert.strictEqual(iframe.getAttribute('allowpaymentrequest'), 'true');
      assert.strictEqual(iframe.getAttribute('style'), 'background: transparent; width: 100%; height: 100%;');
      assert.strictEqual(iframe.getAttribute('src'), url);
    });
  });

  describe('Element.window', function () {
    describe('when the element is not attached', function () {
      it('returns null', function () {
        assert.strictEqual(this.element.window, null);
      });
    });

    describe('when the element is attached', function () {
      attachElement();

      it('returns the iframe.contentWindow', function () {
        const { element } = this;
        assert.strictEqual(element.window, element.iframe.contentWindow);
      });
    });
  });

  describe('Element.attached', function () {
    describe('when the element is not attached', function () {
      it('returns false', function () {
        assert.strictEqual(this.element.attached, false);
      });
    });

    describe('when the element is attached', function () {
      attachElement();

      it('returns true', function () {
        assert.strictEqual(this.element.attached, true);
      });
    });
  });

  describe('Element.attaching', function () {
    it(`returns true when the element has started attaching
        but not finished doing so`, function (done) {
      const { element, validParentElement } = this;
      const assertElementAttaching = sinon.spy(() => assert.strictEqual(element.attaching, true));
      element.on('attach', () => {
        assert(assertElementAttaching.calledOnce);
        done();
      });
      element.attach(validParentElement);
      assertElementAttaching();
    });

    it('returns false when the element has not started attaching', function () {
      const { element } = this;
      assert.strictEqual(element.attaching, false);
    });

    it('returns false when the element has finished attaching', function (done) {
      const { element, validParentElement } = this;
      element.on('attach', () => {
        assert.strictEqual(element.attaching, false);
        done();
      });
      element.attach(validParentElement);
    });
  });

  describe('Element.url', function () {
    it('returns a String starting with the recurly instance API URL', function () {
      const { element, recurly } = this;
      assert.strictEqual(typeof element.url, 'string');
      assert.strictEqual(element.url.indexOf(recurly.config.api), 0);
    });

    it('contains a decodable and accurate config slug', function () {
      const { element } = this;
      const { url } = element;
      const config = JSON.parse(decodeURIComponent(url.substring(url.indexOf('config=') + 7)));
      assert.strictEqual(JSON.stringify(config), JSON.stringify(element.config));
    });
  });

  describe('Element.tabbableItems', function () {
    attachElement();

    beforeEach(function () {
      this.example = this.element.tabbableItems();
    });

    it('returns an Array of HTMLElements', function () {
      const { element, example } = this;
      assert(Array.isArray(example));
      example.forEach(item => assert(item instanceof HTMLElement));
    });

    it('excludes Element frames', function () {
      const { element, example } = this;
      assert.strictEqual(!!~example.indexOf(element.iframe), false);
    });
  });

  describe('listeners', function () {
    beforeEach(function () {
      sinon.spy(this.element, 'update');
    });

    afterEach(function () {
      this.element.update.restore();
    });

    describe('onStateChange', function () {
      it(`is called when the 'state:change' bus message is sent`, function (done) {
        const { element, messageName, sendMessage } = this;
        sinon.spy(element, 'onStateChange');
        element.on(messageName('state:change'), () => {
          assert(element.onStateChange.calledOnce);
          element.onStateChange.restore();
          done();
        });
        assert(element.onStateChange.notCalled);
        sendMessage('state:change');
      });

      it('does not update the state when it is equivalent to the existing state', function () {
        const { element } = this;
        const example = { test: 'value' };
        element.onStateChange(example);
        const state = element.state;
        element.onStateChange({ ...example });
        assert.strictEqual(state, element.state);
      });

      describe('when the new state differs from the existing state', function () {
        beforeEach(function () {
          this.element.onStateChange({ test: 'value' });
          this.example = { test: 'value', john: 'rambo' };
        });

        it('updates the state when it has changed from the existing state', function () {
          const { element, example } = this;
          const { state } = element;
          element.onStateChange(example);
          assert.notStrictEqual(state, element.state);
          assert.deepEqual(example, element.state);
        });

        it(`emits the 'change' event, passing the new state`, function (done) {
          const { element, example } = this;
          element.on('change', state => {
            assert.deepEqual(state, element.state);
            done();
          });
          element.onStateChange(example);
        });

        it('instructs the element to update', function () {
          const { element, example } = this;
          const marker = sinon.stub();
          marker();
          element.onStateChange(example);
          assert(element.update.calledAfter(marker));
        });
      });
    });

    describe('onFocus', function () {
      it(`emits 'focus' when the 'focus' bus message is sent`, function (done) {
        const { element, sendMessage } = this;
        element.on('focus', () => done());
        sendMessage('focus');
      });
    });

    describe('onBlur', function () {
      it(`emits 'blur' when the 'blur' bus message is sent`, function (done) {
        const { element, sendMessage } = this;
        element.on('blur', () => done());
        sendMessage('blur');
      });
    });

    describe('onTab', function () {
      attachElement();

      beforeEach(function () {
        sinon.spy(this.element, 'onTab');
      });

      afterEach(function () {
        this.element.onTab.restore();
      });

      it(`calls focus on the previous tabbable HTMLElement when called with 'previous'`, function () {
        const { element } = this;
        const example = document.querySelector('#test-tab-prev');
        sinon.spy(example, 'focus');
        element.onTab('previous')
        assert(example.focus.calledOnce);
        example.focus.restore();
      });

      it(`calls focus on the next tabbable HTMLElement when called with 'next'`, function () {
        const { element } = this;
        const example = document.querySelector('#test-tab-next');
        sinon.spy(example, 'focus');
        element.onTab('next')
        assert(example.focus.calledOnce);
        example.focus.restore();
      });

      describe(`when the 'tab:previous' message is sent`, function () {
        beforeEach(function () {
          const { element, messageName } = this
          element.bus.send(messageName('tab:previous'));
        });

        it('is called with the corresponding direction', function () {
          const { element } = this;
          assert(element.onTab.calledOnceWithExactly('previous'));
        });
      });

      describe(`when the 'tab:next' message is sent`, function () {
        beforeEach(function () {
          const { element, messageName } = this
          element.bus.send(messageName('tab:next'));
        });

        it('is called with the corresponding direction', function () {
          const { element } = this;
          assert(element.onTab.calledOnceWithExactly('next'));
        });
      });
    });

    describe('onSubmit', function () {
      it(`emits 'submit' when the 'submit' bus message is sent`, function (done) {
        const { element, sendMessage } = this;
        element.on('submit', () => done());
        sendMessage('submit');
      });
    });
  });
});

function attachElement () {
  beforeEach(function (done) {
    const { element, validParentElement } = this;
    element.once('attach', () => done());
    element.attach(validParentElement);
  });
}

function assertElementAttachedTo (element, parent) {
  assert.strictEqual(parent.children.length, 1);
  assert.strictEqual(parent.children[0], element.container);
  assert(parent.contains(element.iframe));
}

function assertElementNotAttachedTo (parent) {
  assert.strictEqual(parent.children.length, 0);
}
