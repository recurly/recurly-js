import assert from 'assert';

export function isAUid () {
  return ['is a 16-char uid', function () {
    const matcher = /^[0-9A-Za-z]{16}$/i;
    const { subject } = this;
    assert(matcher.test(subject));
  }];
}
