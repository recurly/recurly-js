/**
 * dependencies
 */

var type = require('type');
var each = require('each');
var map = require('map');

/**
 * expose
 */

module.exports = {
    element: element
  , value: value
};

/**
 * Detects whether an object is an html element.
 *
 * @param {Mixed} node
 * @return {HTMLElement|Boolean} node
 */

function element (node) {
  if (window.jQuery && node instanceof jQuery) node = node[0];
  var isElem = HTMLElement
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
  return value !== undefined ? set(node, value) : get(node);
}

function get (node) {
  if (type(node) === 'array') node = node[0];
  var nodeType = node && node.type && node.type.toLowerCase();
  if (!nodeType) return;
  else if ('options' in node)
    return node.options[node.selectedIndex].value;
  else if (nodeType === 'radio')
    return document.querySelector('input[data-recurly=' + node.dataset.recurly + ']:checked').value;
  else if ('value' in node)
    return node.value;
}

function set (nodes, value) {
  if (type(nodes) !== 'array') nodes = [nodes];
  each(nodes, function (node) {
    if (!node) return;
    else if ('value' in node)
      node.value = value;
    else if ('innerText' in node)
      node.innerText = value;
  });
}
