import clone from 'component-clone';
import deepAssign from '../util/deep-assign';
import Emitter from 'component-emitter';
import tabbable from 'tabbable';
import { HostedField } from './hosted-field';

const debug = require('debug')('recurly:hostedFields');

export const FIELD_TYPES = ['number', 'month', 'year', 'cvv', 'card'];

/**
 * HostedFields
 *
 * @constructor
 * @param {Object} options
 * @param {Recurly} options.recurly Associated Recurly instance
 * @public
 */

export class HostedFields extends Emitter {
  constructor ({ recurly }) {
    super();
    this.ready = false;
    this.state = {};
    this.fields = [];
    this.errors = [];
    this.initQueue = [];
    this.recurly = recurly;
    this.configure(recurly.sanitizedConfig);
    this.inject();
    this.on('hostedFields:configure', opts => {
      this.configure(opts.recurlyConfig);
      this.fields.forEach(field => {
        if (this.bus) this.bus.send('hostedField:configure', this.fieldConfig(field.type));
      });
    });
    this.on('hostedField:ready', this.onReady.bind(this));
    this.on('hostedField:tab:previous', message => this.onTab('previous', message));
    this.on('hostedField:tab:next', message => this.onTab('next', message));
    this.on('hostedField:state:change', this.update.bind(this));
    this.on('bus:added', bus => {
      this.bus = bus;
      this.fields.forEach(hf => bus.add(hf));
    });
    this.once('destroy', this.destroy.bind(this));
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
      const newSelectors = Object.keys(fields).map(key => fields[key].selector).join('');
      const currentSelectors = Object.keys(this.config.recurly.fields).map(key => {
        return this.config.recurly.fields[key].selector;
      }).join('');
      if (newSelectors !== currentSelectors) return false;
    }
    return !~this.fields.map(f => f.integrityCheck()).indexOf(false);
  }

  // Private

  /**
   * Creates HostedField instances
   *
   * @private
   */
  inject () {
    FIELD_TYPES.forEach(type => {
      try {
        this.fields.push(new HostedField(this.fieldConfig(type)));
        this.initQueue.push(type);
      } catch (e) {
        if (e.name === 'missing-hosted-field-target') {
          if (~['number', 'month', 'year', 'card'].indexOf(type)) {
            this.errors.push(e);
          }
        } else {
          throw e;
        }
      }
    });

    // If we have a card hosted field, clear all missing target errors.
    const cardFieldMissingErrorPresent = this.errors.some(e => e.type === 'card');
    if (cardFieldMissingErrorPresent) {
      // If we are only missing the card field, clear the error
      const missingFieldErrors = this.errors.filter(e => e.name === 'missing-hosted-field-target');
      if (missingFieldErrors.length === 1) {
        this.errors = this.errors.filter(e => !(e.name === 'missing-hosted-field-target' && e.type === 'card'));
      }
    } else {
      this.errors = this.errors.filter(e => e.name !== 'missing-hosted-field-target');
    }
  }

  configure (recurlyConfig) {
    this.config = {
      recurly: clone(recurlyConfig || {})
    };
  }

  /**
   * Removes listeners and external references
   */
  destroy () {
    debug('destroying HostedFields');
    this.off();
    this.ready = false;
    this.fields.forEach(field => field.destroy());
    if (this.bus) this.bus.remove(this);
    this.fields = [];
    this.errors = [];
    this.initQueue = [];
    delete this.recurly;
  }

  onReady (body) {
    const pos = this.initQueue.indexOf(body.type);
    if (~pos) this.initQueue.splice(pos, 1);
    if (this.initQueue.length === 0) {
      this.off('hostedField:ready', this.onReady);
      this.bus.send('hostedFields:ready');
      this.ready = true;
    }
    this.update(body);
  }

  onTab (direction, message) {
    const origin = this.getFieldByType(message.type);
    if (!(origin instanceof HostedField)) return;

    // Find the origin within the tabbable list, and focus in our intended direction
    let tabbableItems = this.tabbableItems();
    let pos = tabbableItems.indexOf(origin.tabbingProxy);
    let destination = direction === 'previous' ? tabbableItems[pos - 1] : tabbableItems[pos + 1];

    if (destination) destination.focus();
  }

  /**
   * Provides an Array of tabbable Elements in the document body,
   * excluding those which correspond to hosted field iframes
   * @return {Array} Elements
   */
  tabbableItems () {
    const fieldFrames = this.fields.map(f => f.iframe);
    return tabbable(window.document.body).filter(el => !~fieldFrames.indexOf(el));
  }

  update (body) {
    let newState = Object.assign({}, body);
    delete newState.type;
    this.state[body.type] = newState;
    if (!this.ready) return;
    this.bus.send('hostedFields:state:change', this.state);
  }

  fieldConfig (type) {
    const fields = this.config.recurly.fields;
    const field = fields[type];
    const busGroupId = this.recurly.bus.groupId;
    const { deviceId, sessionId } = this.config;
    const { displayIcon, inputType, selector } = field;
    if (!fields[type]) return;
    return {
      type,
      deviceId,
      sessionId,
      busGroupId,
      displayIcon,
      inputType,
      selector,
      format: (typeof field.format === 'boolean' ? field.format : fields.all.format),
      recurly: this.config.recurly,
      style: deepAssign({}, fields.all.style, field.style),
      tabIndex: (typeof fields.all.tabIndex === 'number' ? fields.all.tabIndex : field.tabIndex)
    };
  }

  getFieldByType (type) {
    return this.fields.filter(f => f.config.type === type)[0];
  }
}
