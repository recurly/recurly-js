import Element from './element';

export function factory (options) {
  return new CardCvvElement(Object.assign({}, options, { elements: this }));
};

class CardCvvElement extends Element {
  static type = 'cvv';
  static elementClassName = 'CardCvvElement';
}
