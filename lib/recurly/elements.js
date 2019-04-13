import Emitter from 'component-emitter';
import uuid from 'uuid/v4';
import { Bus } from './bus';
import Element from './element';
import { factory as CardElement } from './element/card';
import { factory as CardNumberElement } from './element/card-number';
import { factory as CardMonthElement } from './element/card-month';
import { factory as CardYearElement } from './element/card-year';
import { factory as CardCvvElement } from './element/card-cvv';

export function factory (options) {
  return new Elements(Object.assign({}, options, { recurly: this }));
};

/**
 * Elements
 *
 * Controls a group of Element instances
 *
 * @param  {Object} options
 * @param  {Elements} options.recurly
 */
export default class Elements extends Emitter {
  CardElement = CardElement;
  CardNumberElement = CardNumberElement;
  CardMonthElement = CardMonthElement;
  CardYearElement = CardYearElement;
  CardCvvElement = CardCvvElement;

  static VALID_SETS = [
    ['CardElement'],
    ['CardNumberElement', 'CardMonthElement', 'CardYearElement', 'CardCvvElement']
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

    if (elements.some(e => e.elementClassName === element.elementClassName)) {
      throw new Error(`
        Invalid element. There is already a \`${element.elementClassName}\` in this set.
      `);
    }

    // Validate that the new element can be added to the existing set
    // TODO: Add set rules documentation link to the error
    const newSet = elements.concat(element);
    if (!this.constructor.VALID_SETS.some(set => newSet.every(ne => ~set.indexOf(ne.elementClassName)))) {
      throw new Error(`
        Invalid element. A \`${element.elementClassName}\` may not be added to the existing set:
        ${elements.map(e => `'${e.elementClassName}'`).join(', ')}
      `);
    }

    elements.push(element);

    element.on('attach', this.onElementAttach.bind(this));
    element.on('submit', this.onElementSubmit.bind(this));

    this.sendPeerAnnounce();
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
    const removed = ~pos && elements.splice(pos, 1);
    if (removed) this.sendPeerAnnounce();
    return removed;
  }

  /**
   * Destroys this controller
   *
   * TODO: disable instance upon destruction?
   *
   * @private
   */
  destroy () {
    const { elements, bus } = this;
    elements.forEach(e => e.destroy());
    bus.destroy();
  }

  /**
   * Sends a message announcing the ids of the associated elements
   *
   * @private
   */
  sendPeerAnnounce () {
    const { elements, bus } = this;
    const ids = elements.map(e => e.id);
    bus.send('elements:peer-announce', { ids });
  }

  // Event handlers

  /**
   * Sends the 'elements:ready!' event when no elements are in the process
   * of attaching
   *
   * Called when any element has finished attaching and initializing
   *
   * @private
   * @param {Element} element
   */
  onElementAttach (element) {
    const { elements, bus } = this;
    if (elements.length < 1) return;
    if (elements.some(e => e.attaching)) return;
    bus.send('elements:ready!');
    this.sendPeerAnnounce();
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
