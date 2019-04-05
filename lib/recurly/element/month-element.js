import Element from './element';

export function factory (options) {
  return new MonthElement(Object.assign({}, options, { elements: this }));
};

class MonthElement extends Element {
  static TYPE = 'month';
  static ELEMENT_CLASS_NAME = 'MonthElement';
}
