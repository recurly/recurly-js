/**
 * dependencies
 */

var slug = require('to-slug-case');
var type = require('type');
var each = require('each');

/**
 * expose
 */

module.exports = {
  element: element,
  value: value,
  data: data
};

/**
 * Detects whether an object is an html element.
 *
 * @param {Mixed} node
 * @return {HTMLElement|Boolean} node
 */

function element (node) {
  var jQuery = window.jQuery;
  var isJQuery = jQuery && node instanceof jQuery;
  var isArray = type(node) === 'array';
  var isElem;

  if (isJQuery || isArray) node = node[0];

  if (!node) {
    return false;
  }

  if (typeof HTMLElement !== 'undefined') {
    isElem = node instanceof HTMLElement;
  } else {
    isElem = node.nodeType === 1;
  }

  return isElem && node;
}

/**
 * Gets or sets the value of a given HTML form element
 *
 * supports text inputs, radio inputs, and selects
 *
 * @param {HTMLElement} node
 * @return {String} val value of the element
 */

function value (node, val) {
  if (!element(node)) return null;
  if (typeof val !== 'undefined') {
    return valueSet(node, val);
  } else {
    return valueGet(node);
  }
}

/**
 * Gets an HTMLElement's value property in the context of a form
 *
 * @private
 * @param {HTMLElement} node
 * @return {String} node's value
 */

function valueGet (node) {
  node = element(node);

  var nodeType = node && node.type && node.type.toLowerCase();
  var value;

  if (!nodeType) {
    value = '';
  } else if ('options' in node) {
    value = node.options[node.selectedIndex].value;
  } else if (nodeType === 'checkbox') {
    if (node.checked) value = node.value;
  } else if (nodeType === 'radio') {
    var radios = document.querySelectorAll('input[data-recurly="' + data(node, 'recurly') + '"]');
    each(radios, function (radio) {
      if (radio.checked) value = radio.value;
    });
  } else if ('value' in node) {
    value = node.value;
  }

  return value;
}

/**
 * Updates an element's value property if
 * one exists; else innerText if it exists
 *
 * @private
 * @param {Array[HTMLElement]} nodes
 * @param {Mixed} value
 */

function valueSet (nodes, value) {
  if (type(nodes) !== 'array') nodes = [nodes];
  each(nodes, function (node) {
    if (!node) return;
    else if ('value' in node)
      node.value = value;
    else if ('textContent' in node)
      node.textContent = value;
    else if ('innerText' in node)
      node.innerText = value;
  });
}

/**
 * Gets or sets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 * @param {Mixed} [value]
 * @return {String} value
 */

function data (node, key, value) {
  node = element(node);
  if (!node) return;
  if (typeof value !== 'undefined') {
    return dataSet(node, key, value);
  } else {
    return dataGet(node, key);
  }
}

/**
 * Gets a node's data attribute
 *
 * @private
 * @param {HTMLElement} node
 * @param {String} key
 * @return {String} attribute value
 */

function dataGet (node, key) {
  if (node.dataset) {
    return node.dataset[key];
  } else {
    return node.getAttribute('data-' + slug(key));
  }
}

/**
 * sets a node's data attribute
 *
 * @private
 * @param {HTMLElement} node
 * @param {String} key
 * @param {Mixed} value
 * @return {String} value
 */

function dataSet (node, key, value) {
  if (node.dataset) {
    node.dataset[key] = value;
  } else {
    node.setAttribute('data-' + slug(key), value);
  }
  return '' + value;
}
