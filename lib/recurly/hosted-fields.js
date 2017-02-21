import clone from 'component-clone';
import Emitter from 'component-emitter';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import map from 'lodash.map';
import {HostedField} from './hosted-field';
import errors from '../errors';

const debug = require('debug')('recurly:hostedFields');

const REQUIRED_FIELDS = ['number', 'month', 'year'];
export const FIELD_TYPES = ['cvv'].concat(REQUIRED_FIELDS);

/**
 * HostedFields
 *
 * @constructor
 * @param {Object} options
 * @param {Object} options.recurly options to init a recurly instance
 * @param {String} options.version
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
   * optionally compares fields configuration with current state for parity
   *
   * @param {Object} fields fields configuration to compare against
   * @return {Boolean} whether all fields are present and receivable
   */
  integrityCheck (fields) {
    if (!this.ready) return false;
    if (this.fields.length === 0) return false;
    if (fields) {
      const newSelectors = map(fields, f => f.selector).join('');
      const currentSelectors = map(this.config.recurly.fields, f => f.selector).join('');
      if (newSelectors !== currentSelectors) return false;
    }
    return !~this.fields.map(f => f.integrityCheck()).indexOf(false);
  }

  // Private

  configure (options) {
    this.config = clone(options || {});
  }

  inject () {
    this.on('hostedField:ready', this.readyHandler.bind(this));
    FIELD_TYPES.forEach(type => {
      try {
        this.fields.push(new HostedField(this.fieldConfig(type)));
        this.initQueue.push(type);
      } catch (e) {
        if (e.name === 'missing-hosted-field-target') {
          if (~REQUIRED_FIELDS.indexOf(type)) {
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

  reset () {
    this.off();
    this.ready = false;
    this.readyState = 0;
    this.fields.forEach(field => field.reset());
    this.fields = [];
    this.errors = [];
    this.initQueue = [];
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
    const fields = this.config.recurly.fields;
    const selector = fields[type].selector;
    const format = fields[type].format || fields.all.format;
    const style = merge({}, fields.all.style, fields[type].style);
    return {
      type,
      selector,
      format,
      style,
      recurly: this.config.recurly
    };
  }
}
