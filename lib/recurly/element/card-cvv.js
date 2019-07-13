import Element from './element';

export function factory (options) {
  return new CardCvvElement(Object.assign({}, options, { elements: this }));
};

export class CardCvvElement extends Element {
  static type = 'cvv';
  static elementClassName = 'CardCvvElement';
}
