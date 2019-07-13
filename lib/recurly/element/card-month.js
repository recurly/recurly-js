import Element from './element';

export function factory (options) {
  return new CardMonthElement(Object.assign({}, options, { elements: this }));
};

export class CardMonthElement extends Element {
  static type = 'month';
  static elementClassName = 'CardMonthElement';
}
