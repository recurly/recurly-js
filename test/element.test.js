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
    applyFixtures();

    this.ctx.fixture = 'elements';

    it('only accepts an HTMLElement', function () {
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

      const validExample = document.querySelector('#recurly-elements');
      this.element.attach(validExample);
    });
  });

  describe('Element.remove', function () {

  });

  describe('Element.destroy', function () {

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
