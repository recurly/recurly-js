import clone from 'component-clone';
import Emitter from 'component-emitter';
import last from 'lodash.last';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import map from 'lodash.map';
import tabbable from 'tabbable';
import dom from '../util/dom';
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
    this.on('hostedField:tab:previous', this.onTab.bind(this, 'previous'));
    this.on('hostedField:tab:next', this.onTab.bind(this, 'next'));
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
    this.on('hostedField:ready', this.onReady.bind(this));
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

    this.on('hostedFields:configure', (options) => {
      this.configure(options);
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
    let tabbableItems = tabbable(global.document.body);

    // Add hosted fields to the tabbable list
    this.fields.forEach(field => {
      if (field.container.compareDocumentPosition(tabbableItems[0]) & Node.DOCUMENT_POSITION_FOLLOWING) {
        tabbableItems.unshift(field);
      } else if (field.container.compareDocumentPosition(last(tabbableItems)) & Node.DOCUMENT_POSITION_PRECEDING) {
        tabbableItems.push(field);
      } else {
        tabbableItems.find((item, i) => {
          let el = item instanceof HostedField ? item.container : item;
          let nextItem = tabbableItems[i + 1];
          let nextEl = nextItem instanceof HostedField ? nextItem.container : nextItem;
          if (!dom.element(el)) return;
          if (!dom.element(nextEl)) return;
          if (!(field.container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return;
          if (!(field.container.compareDocumentPosition(nextEl) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
          tabbableItems.splice(i + 1, 0, field);
          return true;
        });
      }
    });

    // Find the origin within the tabbable list, and focus in our intended direction
    tabbableItems.find((el, i) => {
      if (el !== origin) return;
      let destination;
      let fieldsSlice;

      if (direction === 'previous') {
        if (origin instanceof HostedField) {
          const upperBound = tabbableItems.indexOf(origin);
          fieldsSlice = tabbableItems.slice(tabbableItems[0], upperBound)
          for (let i = upperBound; i >= 0; i--) {
            /* Assume that we are trying to tab to the penultimate
             * element in the flieldsSlice collection. This covers
             * the case where we're trying to tab to a previous input
             * that is not a hosted field
              */
            destination = fieldsSlice[upperBound - 1]
            if (fieldsSlice[i] instanceof HostedField) {
              destination = fieldsSlice[i];
              break;
            }
          }
        } else {
            destination = tabbableItems[i - 1] || last(tabbableItems);
        }
      } else {
          if (origin instanceof HostedField) {
            fieldsSlice = tabbableItems.slice(tabbableItems.indexOf(origin) + 1, tabbableItems.length - 1);
            fieldsSlice.find((field, fieldIndex) => {
              if (field instanceof HostedField) {
                destination = field;
                return destination;
              }
            });
          } else {
              destination = tabbableItems[i + 1] || tabbableItems[0];
          }
      }

      destination.focus();
      return true;
    });
  }

  update (body) {
    this.state[body.type] = omit(body, 'type');
    if (!this.ready) return;
    this.bus.send('hostedFields:state:change', this.state);
  }

  fieldConfig (type) {
    const fields = this.config.recurly.fields;
    return {
      type,
      selector: fields[type].selector,
      format: fields[type].format || fields.all.format,
      inputType: fields[type].inputType,
      style: merge({}, fields.all.style, fields[type].style),
      recurly: this.config.recurly
    };
  }

  getFieldByType (type) {
    return this.fields.find(field => field.config.type === type);
  }
}
