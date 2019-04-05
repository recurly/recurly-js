import Element from './element';

export function factory (options) {
  return new YearElement(Object.assign({}, options, { elements: this }));
};

class YearElement extends Element {
  static TYPE = 'year';
  static ELEMENT_CLASS_NAME = 'YearElement';
}
