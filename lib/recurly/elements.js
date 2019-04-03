import Emitter from 'component-emitter';
import uuid from 'uuid/v4';
import { Bus } from './bus';
import Element from './element';
import { factory as CardElement } from './element/card-element';
import { factory as NumberElement } from './element/number-element';
import { factory as MonthElement } from './element/month-element';
import { factory as YearElement } from './element/year-element';
import { factory as CvvElement } from './element/cvv-element';

export function factory (options) {
  return new Elements(Object.assign({}, options, { recurly: this }));
};

/**
 * Elements
 *
 * Controls a group of Element instances
 *
 * - Contains a unique bus to isolate messages
 *
 * @param  {Object} options
 * @param  {Elements} options.recurly
 */
export default class Elements extends Emitter {
  CardElement = CardElement;
  NumberElement = NumberElement;
  MonthElement = MonthElement;
  YearElement = YearElement;
  CvvElement = CvvElement;

  static VALID_SETS = [
    ['CardElement'],
    ['NumberElement', 'MonthElement', 'YearElement', 'CvvElement']
  ];

  constructor ({ recurly }) {
    super();
    this.recurly = recurly;
    this.id = `recurly-elements:${uuid()}`;
    this.elements = [];
    this.bus = new Bus({ api: recurly.config.api, role: 'elements' });
    this.bus.add(this);
    this.bus.add(recurly);
    this.on('destroy', (...args) => this.destroy(...args));
  }

  /**
   * Adds an element
   *
   * @private
   * @param  {Element} element
   */
  add (element) {
    const { elements } = this;

    if (!(element instanceof Element)) {
      throw new Error(`Invalid element. Expected Element, got ${typeof element}`);
    }

    if (elements.some(e => e.constructor.name === element.constructor.name)) {
      throw new Error(`Invalid element. There is already a \`${element.constructor.name}\` in this set.`);
    }

    // Validate that the new element can be added to the existing set
    // TODO: Add set rules documentation link to the error
    const newSet = elements.concat(element);
    if (!this.constructor.VALID_SETS.some(set => newSet.every(ne => ~set.indexOf(ne.constructor.name)))) {
      throw new Error(`
        Invalid element. A \`${element.constructor.name}\` may not be added to the existing set:
        ${elements.map(e => `'${e.constructor.name}'`).join(', ')}
      `);
    }

    elements.push(element);

    element.on('attach', this.onElementAttach.bind(this));
    element.on('remove', this.onElementRemove.bind(this));
    element.on('submit', this.onElementSubmit.bind(this));
  }

  /**
   * Removes an element
   *
   * @private
   * @param  {Element} element
   * @return {Boolean} whether the removal was performed
   */
  remove (element) {
    const { elements } = this;
    const pos = elements.indexOf(element);
    return ~pos && elements.splice(pos, 1);
  }

  /**
   * Destroys this controller
   *
   * TODO: disable instance upon destruction?
   *
   * @private
   */
  destroy () {
    this.elements.forEach(e => e.destroy());
    this.bus.destroy();
  }

  // Event handlers

  /**
   * Sends the elements:ready! event when all elements are attached to the DOM
   *
   * @private
   * @param {Element} element
   */
  onElementAttach (element) {

    /**
     * FIXME: This is an essential init event. An Elements group will await its final
     * init steps (becoming visible) until the entire set is ready to render. Should this
     * be the case?
     */

    if (this.elements.every(e => e.attached)) this.bus.send('elements:ready!');
  }

  // TODO: should this mark elements not ready?
  onElementRemove (element) {

  }

  /**
   * Emits the submit event to indicate when the event has occurred on an Element
   *
   * @private
   * @param {Element} element
   */
  onElementSubmit (element) {
    this.emit('submit', element);
  }
}
