import assert from 'node:assert/strict';
import test from 'node:test';
import { papers } from '../src/lib/papers';
import { paperSlugs, paperSlug, paperPath } from '../src/lib/paper-urls';
import { withBase } from '../src/lib/urls';

const paper = (id: string) => papers.find((item) => item.core.id === id)!;

test('paper URLs use the requested conference abbreviations and first-author surnames', () => {
  assert.equal(paperSlug(paper('77')), 'ec79-miyazaki');
  assert.equal(paperSlug(paper('76')), 'wiss2025-yumura');
  assert.equal(paperSlug(paper('78')), 'haptics36-kamimura');
  assert.equal(paperSlug(paper('79')), 'i2026-nishiyama');
  assert.equal(paperSlug(paper('64')), 'i2025-inoue');
  assert.equal(paperSlug(paper('47')), 'i2024-kamimura');
  assert.equal(paperSlug(paper('34')), 'i2023-oyanagi');
  assert.equal(paperSlug(paper('25')), 'i2022-kubota');
  assert.equal(paperSlug(paper('74')), 'ec2025-hokin');
  assert.equal(paperSlug(paper('59')), 'info2024-tamahori');
});

test('all published papers have stable, unique, non-numeric URL slugs', () => {
  const slugs = papers.map(paperSlug);
  assert.equal(new Set(slugs).size, papers.length);
  assert.ok(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug)));
  for (const item of papers) {
    assert.equal(paperSlug({ ...item, publication: {}, core: { ...item.core, title: 'Edited title', authors: ['Changed name'] } }), paperSlug(item));
  }
  assert.throws(() => paperSlug({ core: { id: 'unregistered', title: 'New paper' } }), /paper-slugs\.json/);
});

test('new URLs work under the temporary project path and the future custom domain', () => {
  assert.equal(paperPath(paper('77')), '/ec79-miyazaki/');
  assert.equal(withBase(paperPath(paper('77')), '/dl.yumulab.org/'), '/dl.yumulab.org/ec79-miyazaki/');
  assert.equal(withBase(paperPath(paper('77')), '/'), '/ec79-miyazaki/');
  assert.equal(paperSlugs['77'], 'ec79-miyazaki');
});
