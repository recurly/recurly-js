import assert from 'assert';
import loadScriptPromise from '../../../lib/util/load-script-promise';

describe('loadScriptPromise', () => {
  const url = () => `https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js?${Math.random()}`;
  const getScriptTag = (url) => Array.from(document.scripts).find(s => s.src === url);

  it('loads a script', async () => {
    const example = url();
    await loadScriptPromise(example);
    assert.strictEqual(getScriptTag(example).src, example);
  });

  it('sets attributes', async () => {
    const example = url();
    const exampleAttrValue = 'test-value';
    await loadScriptPromise(example, { attrs: { 'data-test': exampleAttrValue } });
    const script = getScriptTag(example);
    assert.strictEqual(script.dataset.test, exampleAttrValue);
  });
});
