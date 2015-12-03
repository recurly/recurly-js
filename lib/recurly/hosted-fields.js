import omit from 'lodash.omit';
import merge from 'lodash.merge';
import Emitter from 'component-emitter';
import intersection from 'lodash.intersection';
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
    this.initQueue = intersection(fieldTypes, Object.keys(this.config.fields));
    this.initQueue.forEach(type => {
      const selector = this.config.fields[type];
      const required = !!~requiredFieldTypes.indexOf(type);
      const recurly = this.config;
      const style = merge({}, this.config.style.all, this.config.style[type]);
      this.fields.push(new HostedField({ type, required, selector, style, recurly }));
    });
  }

  readyHandler (body) {
    let pos = this.initQueue.indexOf(body.type);
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