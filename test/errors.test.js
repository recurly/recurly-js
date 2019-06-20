import assert from 'assert';
import errors from '../lib/recurly/errors';
import {initRecurly} from './support/helpers';

describe('errors', () => {
  const valid = 'not-configured';
  const invalid = 'an-invalid-error';

  beforeEach(function () {
    this.recurly = initRecurly();
  });

  it('throws when the requested error is not in the directory', function () {
    assert.throws(() => errors(invalid), Error, 'invalid error');
  });

  it('accepts a context', function () {
    const err = errors(valid, { some: 'context' });
    assert.strictEqual(err.some, 'context');
  });

  it('will report an error if given a reporter', function () {
    const reporter = this.recurly.reporter;
    reporter.send.reset();
    errors(valid, { some: 'context' }, { reporter });
    assert(reporter.send.calledOnce);
  });

  describe('RecurlyError', () => {
    it('behaves like an Error', function () {
      const err = errors(valid);
      assert.strictEqual(typeof err.name, 'string');
      assert.strictEqual(typeof err.message, 'string');
    });
  });
});
