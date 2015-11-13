import clone from 'component-clone';
import Emitter from 'component-emitter';
import {HostedField} from './hosted-field';

const debug = require('debug')('recurly:hostedFields');

const fieldTypes = ['number', 'month', 'year', 'cvv'];

/**
 * HostedFields
 *
 * @constructor
 * @param {Object} options
 * @param {Object} options.recurly options to init a recurly instance
 * @param {Object} options.fields
 * @param {Object} options.style
 * @public
 */

export class HostedFields extends Emitter {
  constructor (options) {
    super();
    this.fields = [];
    this.config = options;
    this.inject();
  }

  inject () {
    this.initQueue = clone(fieldTypes);
    this.on('hostedField:ready', this.readyHandler.bind(this));
    fieldTypes.forEach(type => {
      if (!(type in this.config.fields)) return;
      this.fields.push(new HostedField({
        type: type,
        selector: this.config.fields[type],
        style: this.config.style, // TODO: limit this to the style specific to this field
        recurly: this.config.recurly
      }));
    });
  }

  readyHandler (body) {
    let pos = this.initQueue.indexOf(body.type);
    if (~pos) this.initQueue.splice(pos, 1);
    if (this.initQueue.length === 0) {
      this.off('hostedField:ready', this.readyHandler);
      this.emit('hostedFields:ready');
    }
  }
}
