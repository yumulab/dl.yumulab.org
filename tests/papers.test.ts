import assert from 'node:assert/strict';
import test from 'node:test';
import { papers, paperType, typeInfo, filterPapers, readFilters, paperDate, paperFiscalYear, normalize, safeUrl, embedUrl, thumbnail, groupPapersByFiscalYear } from '../src/lib/papers';
import type { Paper } from '../src/lib/papers';

const defaults = readFilters(new URLSearchParams());

test('Japanese and Latin search normalizes width, case and whitespace', () => {
  assert.equal(normalize('  ＡＲ　Quest  '), 'ar quest');
  const results = filterPapers(papers, { ...defaults, q: '宮崎　野球場' });
  assert.deepEqual(results.map((paper) => paper.core.id), ['77']);
});

test('search includes keywords and abstracts and combines every search term', () => {
  const results = filterPapers(papers, { ...defaults, q: 'Ｑｕｅｓｔ AR' });
  assert.ok(results.some((paper) => paper.core.id === '77'));
  assert.equal(filterPapers(papers, { ...defaults, q: '宮崎 この語は存在しないxyz' }).length, 0);
});

test('fiscal year, publication type and search combine; sorting reverses dates', () => {
  const results = filterPapers(papers, { ...defaults, year: '2025', type: 'domestic-conference', q: '湯村' });
  assert.ok(results.length > 1);
  assert.ok(results.every((paper) => paperFiscalYear(paper) === '2025' && paperType(paper) === 'domestic-conference'));
  const newest = filterPapers(papers, defaults);
  const oldest = filterPapers(papers, { ...defaults, sort: 'oldest' });
  assert.equal(paperDate(newest[0]), paperDate(oldest.at(-1)!));
  assert.equal(paperDate(newest.at(-1)!), paperDate(oldest[0]));
});

test('shared URL restores Japanese queries and validates filter options', () => {
  const restored = readFilters(new URLSearchParams('q=%E6%B9%AF%E6%9D%91&year=2025&type=domestic-conference&sort=oldest&view=list'));
  assert.deepEqual(restored, { q: '湯村', year: '2025', type: 'domestic-conference', sort: 'oldest', view: 'list' });
  const invalid = readFilters(new URLSearchParams('year=invalid&type=toString&sort=wrong&view=wrong'));
  assert.deepEqual(invalid, defaults);
});

test('shared URLs restore all three display modes without changing search results', () => {
  const resultIds = filterPapers(papers, { ...defaults, q: '湯村', year: '2025' }).map((paper) => paper.core.id);
  for (const view of ['list', 'grid', 'text'] as const) {
    const restored = readFilters(new URLSearchParams({ q: '湯村', year: '2025', view }));
    assert.equal(restored.view, view);
    assert.deepEqual(filterPapers(papers, restored).map((paper) => paper.core.id), resultIds);
  }
  assert.equal(defaults.view, 'grid');
  assert.equal(readFilters(new URLSearchParams('view=tile')).view, 'grid');
});

test('fiscal year groups follow both sort directions and keep every paper in order', () => {
  const years = [...new Set(papers.map(paperFiscalYear))].sort();
  for (const sort of ['oldest', 'newest'] as const) {
    const sorted = filterPapers(papers, { ...defaults, sort });
    const grouped = groupPapersByFiscalYear(sorted);
    assert.deepEqual(grouped.map((group) => group.year), sort === 'oldest' ? years : [...years].reverse());
    assert.deepEqual(grouped.flatMap((group) => group.papers.map((paper) => paper.core.id)), sorted.map((paper) => paper.core.id));
    assert.ok(grouped.every((group) => group.papers.every((paper) => paperFiscalYear(paper) === group.year)));
  }
});

test('fiscal year headings match the filtered results in every display mode', () => {
  for (const view of ['list', 'grid', 'text'] as const) {
    const results = filterPapers(papers, { ...defaults, view, year: '2025', type: 'domestic-conference', q: '湯村' });
    const grouped = groupPapersByFiscalYear(results);
    assert.ok(results.length > 0);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].year, '2025');
    assert.equal(grouped[0].papers.length, results.length);
    assert.deepEqual(groupPapersByFiscalYear(filterPapers(papers, { ...defaults, view, q: 'この語は存在しないxyz' })), []);
  }
});

test('fiscal year boundaries include April 1 through the following March 31', () => {
  const samples: Paper[] = ['2025-03-31', '2025-04-01', '2026-03-31', '2026-04-01'].map((date, index) => ({
    core: { id: String(index), title: date, sortingDate: `${date}T00:00:00.000Z` },
  }));
  assert.deepEqual(samples.map(paperFiscalYear), ['2024', '2025', '2025', '2026']);
  const results = filterPapers(samples, { ...defaults, year: '2025' });
  assert.deepEqual(results.map((paper) => paper.core.id), ['2', '1']);
  const grouped = groupPapersByFiscalYear(results);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].year, '2025');
  assert.deepEqual(grouped[0].papers, results);
  assert.equal(paperFiscalYear({ core: { id: 'no-date', title: 'No date' } }), '');
  assert.equal(paperFiscalYear({ core: { id: 'publication-only', title: 'Publication only' }, publication: { publishedDate: '2026-03-01' } }), '2025');
});

test('missing thumbnails use the placeholder and IDs remain unique', () => {
  assert.equal(new Set(papers.map((paper) => paper.core.id)).size, papers.length);
  const missing = papers.find((paper) => !paper.core.thumbnail && !paper.core.thumbnailSmall)!;
  assert.equal(thumbnail(missing), '/images/paper-placeholder.svg');
  assert.equal(thumbnail(papers.find((paper) => paper.core.id === '77')!), '/images/papers/77.jpg');
});

test('external links reject executable URLs and embeds accept supported providers', () => {
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
  assert.equal(safeUrl('data:text/html,test'), undefined);
  assert.equal(safeUrl(' http://dl.yumulab.org/api/files/123 '), 'https://dl.yumulab.org/api/files/123');
  assert.equal(embedUrl('https://www.youtube.com/watch?v=vwfBaLy4WGU'), 'https://www.youtube-nocookie.com/embed/vwfBaLy4WGU');
  assert.equal(embedUrl('https://example.com/embed/123'), undefined);
  assert.equal(embedUrl('https://speakerdeck.com.evil.example/player/abc'), undefined);
});

test('display categories merge domestic proceedings and reports and preserve English journals', () => {
  const cases = [
    ['paper-conference', 'ja', 'domestic-conference', '国内学会'],
    ['report', 'ja', 'domestic-conference', '国内学会'],
    ['talk', 'ja', 'presentation', '予稿なし発表'],
    ['paper-conference', 'en', 'international-conference', '国際学会'],
    ['report', 'en', 'international-conference', '国際学会'],
    ['talk', 'en', 'international-conference', '国際学会'],
    ['article-journal', 'en', 'article-journal', '論文誌'],
    ['article-journal', 'ja', 'article-journal', '論文誌'],
    ['thesis', 'ja', 'thesis', '学位論文'],
    ['paper-conference', '', 'domestic-conference', '国内学会'],
    ['', '', 'other', 'その他'],
  ];
  for (const [type, language, expectedType, label] of cases) {
    const paper: Paper = { core: { id: 'sample', title: 'Sample', type, language } };
    assert.equal(paperType(paper), expectedType);
    assert.equal(typeInfo(paperType(paper)).label, label);
  }
});

test('category filters use displayed categories and category names are searchable', () => {
  for (const [type, label] of [
    ['domestic-conference', '国内学会'],
    ['international-conference', '国際学会'],
    ['article-journal', '論文誌'],
    ['presentation', '予稿なし発表'],
  ]) {
    const expected = filterPapers(papers.filter((paper) => paperType(paper) === type), defaults);
    assert.ok(expected.length > 0);
    assert.deepEqual(filterPapers(papers, { ...defaults, type }), expected);
    assert.ok(expected.every((paper) => filterPapers([paper], { ...defaults, q: label }).length === 1));
  }
  assert.ok(filterPapers(papers, { ...defaults, type: 'international-conference' }).every((paper) => paper.core.type !== 'article-journal'));
});

test('legacy category URLs resolve to the new merged categories', () => {
  assert.equal(readFilters(new URLSearchParams('type=paper-conference')).type, 'domestic-conference');
  assert.equal(readFilters(new URLSearchParams('type=report')).type, 'domestic-conference');
  assert.equal(readFilters(new URLSearchParams('type=talk')).type, 'presentation');
});
