import Element from './element';

export function factory (options) {
  return new CardNumberElement(Object.assign({}, options, { elements: this }));
};

export class CardNumberElement extends Element {
  static type = 'number';
  static elementClassName = 'CardNumberElement';
  static supportsTokenization = true;
}
