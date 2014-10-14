describe('to-slug-case', function () {

var assert = require('assert');
var slug = require('to-slug-case');

it('shouldnt touch slug case', function () {
  assert('a-slug-case-string' == slug('a-slug-case-string'));
});

it('should convert camel case', function () {
  assert('a-camel-case-string' == slug('aCamelCaseString'));
});

it('should convert snake case', function () {
  assert('a-snake-case-string' == slug('a_snake_case_string'));
});

it('should convert space case', function () {
  assert('a-space-case-string' == slug('a space case string'));
});

it('should convert dot case', function () {
  assert('a-dot-case-string' == slug('a.dot.case.string'));
});

it('should convert title case', function () {
  assert('a-title-case-of-string' == slug('A Title: Case of String'));
});

it('should convert constant case', function () {
  assert('a-constant-case-string' == slug('A_CONSTANT_CASE_STRING'));
});

});