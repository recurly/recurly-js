import Element from './element';

export function factory (options) {
  return new CVVElement(Object.assign({}, options, { elements: this }));
};

class CVVElement extends Element {
  static TYPE = 'cvv';
}
