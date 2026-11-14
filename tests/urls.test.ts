import assert from 'node:assert/strict';
import test from 'node:test';
import { withBase } from '../src/lib/urls';

test('project Pages routes and assets stay inside the repository base', () => {
  assert.equal(withBase('/', '/dl.yumulab.org/'), '/dl.yumulab.org/');
  assert.equal(withBase('/papers/ec79-miyazaki/', '/dl.yumulab.org/'), '/dl.yumulab.org/papers/ec79-miyazaki/');
  assert.equal(withBase('/images/papers/77.jpg', '/dl.yumulab.org'), '/dl.yumulab.org/images/papers/77.jpg');
  assert.equal(withBase('/?q=%E6%B9%AF%E6%9D%91', '/dl.yumulab.org/'), '/dl.yumulab.org/?q=%E6%B9%AF%E6%9D%91');
});

test('custom domain routes work when the base is changed to root', () => {
  assert.equal(withBase('/', '/'), '/');
  assert.equal(withBase('/about/', '/'), '/about/');
  assert.equal(withBase('/images/paper-placeholder.svg', '/'), '/images/paper-placeholder.svg');
});
