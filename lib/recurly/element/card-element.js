import Element from './element';

export function factory (options) {
  return new CardElement(Object.assign({}, options, { elements: this }));
};

class CardElement extends Element {
  static TYPE = 'card';
  static ELEMENT_CLASS_NAME = 'CardElement';
}
