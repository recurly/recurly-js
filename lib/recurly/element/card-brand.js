import Element from './element';

export function factory (options) {
  return new CardBrandElement({ ...options, inputType: 'select', elements: this });
}

export class CardBrandElement extends Element {
  static type = 'brand';
  static elementClassName = 'CardBrandElement';
}
