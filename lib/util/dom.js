import slug from 'to-slug-case';
import each from 'component-each';
import Promise from 'promise';
import loadScriptPromise from './load-script-promise';

// Delegation wrappers allow tests to stub dom.loadScript / dom.loadStyle / dom.loadLibs
// and have those stubs affect named imports of those functions.
const dom = {
  createHiddenInput,
  data,
  element,
  findNodeInParents,
  value,
  loadLibs: _loadLibs,
  loadScript: _loadScript,
  loadStyle: _loadStyle,
};

export default dom;
export { createHiddenInput, data, element, findNodeInParents, value };
export function loadLibs (...a) { return dom.loadLibs(...a); }
export function loadScript (...a) { return dom.loadScript(...a); }
export function loadStyle (...a) { return dom.loadStyle(...a); }

function element (node) {
  var jQuery = window.jQuery;
  var isJQuery = jQuery && node instanceof jQuery;
  var isElem;

  if (isJQuery || Array.isArray(node)) node = node[0];
  if (typeof node === 'string') node = window.document.querySelector(node);

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

function value (node, val) {
  if (!element(node)) return null;
  if (typeof val !== 'undefined') {
    return valueSet(node, val);
  } else {
    return valueGet(node);
  }
}

function valueGet (node) {
  node = element(node);

  var nodeType = node && node.type && node.type.toLowerCase();
  var value;

  if (!nodeType) {
    value = '';
  } else if ('options' in node) {
    let option = node.options[node.selectedIndex] || node.options[0] || { value: '' };
    value = option.value;
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

function valueSet (nodes, value) {
  if (!Array.isArray(nodes)) nodes = [nodes];
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

function data (node, key, value) {
  node = element(node);
  if (!node) return;
  if (typeof value !== 'undefined') {
    return dataSet(node, key, value);
  } else {
    return dataGet(node, key);
  }
}

function dataGet (node, key) {
  if (node.dataset) {
    return node.dataset[key];
  } else {
    return node.getAttribute('data-' + slug(key));
  }
}

function dataSet (node, key, value) {
  if (node.dataset) {
    node.dataset[key] = value;
  } else {
    node.setAttribute('data-' + slug(key), value);
  }
  return '' + value;
}

function findNodeInParents (node, targetTagName) {
  node = element(node);
  if (!node) return null;
  if (node.tagName.match(RegExp(targetTagName, 'i'))) return node;
  return findNodeInParents(node.parentNode, targetTagName);
}

function createHiddenInput (attributes = {}) {
  let inputType = 'input';
  if (~['button', 'select'].indexOf(attributes.type)) {
    inputType = attributes.type;
    delete attributes.type;
  }
  let hidden = window.document.createElement(inputType);
  if (!('type' in attributes)) attributes.type = 'text';
  if (!('style' in attributes)) attributes.style = 'position: absolute; top: 0px; left: -1000px; opacity: 0;';
  attributes['aria-hidden'] = true;

  Object.keys(attributes).forEach(attr => hidden.setAttribute(attr, attributes[attr]));

  return hidden;
}

function _loadLibs (...libUrls) {
  return Promise.all(libUrls.map(url => loadScriptPromise(url)));
}

function _loadScript (url, opts) {
  return loadScriptPromise(url, opts);
}

function _loadStyle (url, opts) {
  return new Promise((resolve, reject) => {
    const linkEle = document.createElement('link');
    linkEle.onload = () => resolve();
    linkEle.onerror = () => reject();

    opts = opts || {};
    opts.href = url;
    opts.type = 'text/css';
    opts.rel = 'stylesheet';

    Object.entries(opts).forEach(([attr, val]) => {
      linkEle.setAttribute(attr, val);
    });

    document.querySelector('head').appendChild(linkEle);
  });
}
