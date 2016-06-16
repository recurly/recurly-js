import omit from 'lodash.omit';
import merge from 'lodash.merge';
import Emitter from 'component-emitter';
import {HostedField} from './hosted-field';
import errors from '../errors';

const debug = require('debug')('recurly:hostedFields');

const requiredFields = ['number', 'month', 'year'];
const fieldTypes = ['cvv'].concat(requiredFields);

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
    this.errors = [];
    this.initQueue = [];
    this.readyState = 0;
    this.configure(options);
    this.inject();
    this.on('hostedField:state:change', this.update.bind(this));
    this.on('bus:added', bus => {
      this.bus = bus;
      this.fields.forEach(hf => bus.add(hf));
    });
  }

  /**
   * checks integrity of constituent fields
   *
   * @return {Boolean} whether all fields are present and receivable
   * @return {Undefined} when
   */
  integrityCheck () {
    if (!this.ready) return false;
    if (this.fields.length === 0) return false;
    return !~this.fields.map(f => f.integrityCheck()).indexOf(false);
  }

  // Private

  configure (options) {
    this.config = options || {};
    this.config.style = this.config.style || {};
  }

  inject () {
    this.on('hostedField:ready', this.readyHandler.bind(this));
    fieldTypes.forEach(type => {
      try {
        this.fields.push(new HostedField(this.fieldConfig(type)));
        this.initQueue.push(type);
      } catch (e) {
        if (e.name === 'missing-hosted-field-target') {
          if (~requiredFields.indexOf(type)) {
            this.errors.push(e);
          }
        } else throw e;
      }
    });
    this.on('hostedFields:configure', () => {
      this.fields.forEach(field => {
        if (this.bus) this.bus.send('hostedField:configure', this.fieldConfig(field.type));
      });
    });
  }

  readyHandler (body) {
    const pos = this.initQueue.indexOf(body.type);
    if (~pos) this.initQueue.splice(pos, 1);
    if (this.initQueue.length === 0) {
      this.off('hostedField:ready', this.readyHandler);
      this.bus.send('hostedFields:ready');
      this.ready = true;
    }
    this.update(body);
  }

  update (body) {
    this.state[body.type] = omit(body, 'type');
    if (!this.ready) return;
    this.bus.send('hostedFields:state:change', this.state);
  }

  fieldConfig (type) {
    return {
      type,
      selector: this.config.fields[type],
      style: merge({}, this.config.style.all, this.config.style[type]),
      recurly: this.config
    };
  }
}
