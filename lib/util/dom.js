/**
 * dependencies
 */

var slug = require('to-slug-case');
var type = require('type');
var each = require('each');
var map = require('map');

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
  var isJQuery = window.jQuery && node instanceof jQuery;
  var isArray = type(node) === 'array';
  if (isJQuery || isArray) node = node[0];

  var isElem = typeof HTMLElement !== 'undefined'
    ? node instanceof HTMLElement
    : node && node.nodeType === 1;

  return isElem && node;
};

/**
 * Gets or sets the value of a given HTML form element
 *
 * supports text inputs, radio inputs, and selects
 *
 * @param {HTMLElement} node
 * @return {String} value of the element
 */

function value (node, value) {
  if (!element(node)) return null;
  return typeof value !== 'undefined'
    ? valueSet(node, value)
    : valueGet(node);
}

/**
 * Gets an HTMLElement's value property in the context of a form
 *
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
 */

function data (node, key, value) {
  node = element(node);
  if (!node) return;
  return typeof value !== 'undefined'
    ? dataSet(node, key, value)
    : dataGet(node, key);
}

/**
 * Gets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 */

function dataGet (node, key) {
  return node.dataset
    ? node.dataset[key]
    : node.getAttribute('data-' + slug(key));
}

/**
 * sets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 * @param {Mixed} value
 */

function dataSet (node, key, value) {
  if (node.dataset) node.dataset[key] = value;
  else node.setAttribute('data-' + slug(key), value);
}
