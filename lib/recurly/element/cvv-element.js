import Element from './element';

export function factory (options) {
  return new CvvElement(Object.assign({}, options, { elements: this }));
};

class CvvElement extends Element {
  static TYPE = 'cvv';
}
