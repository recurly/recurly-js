import omit from 'lodash.omit';
import merge from 'lodash.merge';
import Emitter from 'component-emitter';
import {HostedField} from './hosted-field';
import errors from '../errors';

const debug = require('debug')('recurly:hostedFields');

const requiredFieldTypes = ['number', 'month', 'year'];
const fieldTypes = ['cvv'].concat(requiredFieldTypes);

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
    this.ready = false;
    this.state = {};
    this.fields = [];
    this.initQueue = [];
    this.configure(options);
    this.inject();
    this.on('hostedField:state:change', this.update.bind(this));
  }

  configure (options) {
    this.config = {};
    requiredFieldTypes.forEach(type => {
      if (type in options.fields) return;
      throw errors('config-missing-field', { type: type });
    });
    this.config = options;
    this.config.style = this.config.style || {};
  }

  inject () {
    this.on('hostedField:ready', this.readyHandler.bind(this));
    fieldTypes.forEach(type => {
      const required = !!~requiredFieldTypes.indexOf(type);
      try {
        this.fields.push(new HostedField({
          type,
          selector: this.config.fields[type],
          style: merge({}, this.config.style.all, this.config.style[type]),
          recurly: this.config
        }));
        this.initQueue.push(type);
      } catch (e) {
        // The field reports that there is no target
        if (!required && e.name === 'missing-hosted-field-target') {
          return;
        }
        throw e;
      }
    });
  }

  readyHandler (body) {
    const pos = this.initQueue.indexOf(body.type);
    if (~pos) this.initQueue.splice(pos, 1);
    if (this.initQueue.length === 0) {
      this.off('hostedField:ready', this.readyHandler);
      this.emit('hostedFields:ready');
      this.ready = true;
    }
    this.update(body);
  }

  update (body) {
    this.state[body.type] = omit(body, 'type');
    if (!this.ready) return;
    this.emit('hostedFields:state:change', this.state);
  }
}
