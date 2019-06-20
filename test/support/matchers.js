import assert from 'assert';

export function isABase64EncodedUUID () {
  const matcher = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return ['is a base64-encoded uuid', function () {
    const { subject } = this;
    assert(matcher.test(atob(subject)));
  }];
}
