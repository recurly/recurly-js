import Element from './element';

export function factory (options) {
  return new NumberElement(Object.assign({}, options, { elements: this }));
};

class NumberElement extends Element {
  static TYPE = 'cvv';
  static ELEMENT_CLASS_NAME = 'NumberElement';
}
