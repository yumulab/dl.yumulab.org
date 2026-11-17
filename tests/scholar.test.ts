import assert from 'node:assert/strict';
import test from 'node:test';
import { localPaperPdfPath, paperPdf, papers, type Paper } from '../src/lib/papers';
import { paperPath } from '../src/lib/paper-urls';
import { paperFullTextPath, scholarMetadata } from '../src/lib/scholar';

const site = 'https://dl.yumulab.org';
const sample = papers.find((paper) => paper.core.id === '70')!;
const values = (paper: Paper, name: string) => scholarMetadata(paper, site)
  .filter((tag) => tag.name === `citation_${name}`).map((tag) => tag.content);

test('citation tags identify the paper, individual authors, publication date and conference', () => {
  assert.deepEqual(values(sample, 'title'), [sample.core.title]);
  assert.deepEqual(values(sample, 'author'), sample.core.authors);
  assert.deepEqual(values(sample, 'publication_date'), ['2025/12/04']);
  assert.deepEqual(values(sample, 'conference_title'), [sample.publication!.bookTitle]);
  assert.deepEqual(values(sample, 'journal_title'), []);
  assert.deepEqual(values(sample, 'doi'), ['10.1109/ICCE-Asia67487.2025.11263520']);
  assert.deepEqual(values(sample, 'firstpage'), ['1']);
  assert.deepEqual(values(sample, 'lastpage'), ['4']);
});

test('citation dates use the publication date before presentation, never the sorting date', () => {
  const paper: Paper = {
    core: { ...sample.core, sortingDate: '2030-01-01', presentationDate: '2025-09-01' },
    publication: { publishedDate: '2025-08-21T00:00:00.000Z' },
  };
  assert.deepEqual(values(paper, 'publication_date'), ['2025/08/21']);
  paper.publication = {};
  assert.deepEqual(values(paper, 'publication_date'), ['2025/09/01']);
  delete paper.core.presentationDate;
  assert.deepEqual(values(paper, 'publication_date'), []);
  paper.publication.publishedDate = '2024';
  assert.deepEqual(values(paper, 'publication_date'), ['2024']);
});

test('journal metadata handles DOI URLs, issue numbers, en dashes and single pages', () => {
  const paper: Paper = {
    core: { ...sample.core, type: 'article-journal' },
    publication: {
      bookTitle: 'Journal of Testing', bookTitleAbbr: 'J. Test', volume: '18', number: '2',
      page: ' 1 – 11 ', DOI: 'https://doi.org/10.1234/example', ISSN: '1234-5678',
    },
  };
  assert.deepEqual(values(paper, 'journal_title'), ['Journal of Testing']);
  assert.deepEqual(values(paper, 'conference_title'), []);
  assert.deepEqual(values(paper, 'volume'), ['18']);
  assert.deepEqual(values(paper, 'issue'), ['2']);
  assert.deepEqual(values(paper, 'firstpage'), ['1']);
  assert.deepEqual(values(paper, 'lastpage'), ['11']);
  assert.deepEqual(values(paper, 'doi'), ['10.1234/example']);
  paper.publication!.page = 'e123';
  paper.publication!.DOI = 'http://id.nii.ac.jp/1001/00177074/';
  assert.deepEqual(values(paper, 'firstpage'), ['e123']);
  assert.deepEqual(values(paper, 'lastpage'), []);
  assert.deepEqual(values(paper, 'doi'), []);
});

test('publication metadata omits empty values and removes legacy control characters', () => {
  const paper: Paper = {
    core: { ...sample.core, authors: ['Author One', ' ', 'Author Two'] },
    publication: { bookTitle: 'Journal\u0000Name', volume: ' ', page: '' },
  };
  assert.deepEqual(values(paper, 'author'), ['Author One', 'Author Two']);
  assert.deepEqual(values(paper, 'conference_title'), ['Journal Name']);
  assert.deepEqual(values(paper, 'volume'), []);
  assert.ok(scholarMetadata(paper, site).every((tag) => tag.content.trim()));
  for (const type of ['thesis', 'preprint', 'presentation', 'talk']) {
    paper.core.type = type;
    assert.deepEqual(values(paper, 'conference_title'), []);
    assert.deepEqual(values(paper, 'journal_title'), []);
  }
});

test('citation PDF URLs are absolute and share the abstract directory, including a deployment base', () => {
  for (const base of ['/', '/dl.yumulab.org/']) {
    const tags = scholarMetadata(sample, site, base);
    const abstract = tags.find((tag) => tag.name === 'citation_abstract_html_url')!.content;
    const pdf = tags.find((tag) => tag.name === 'citation_pdf_url')!.content;
    assert.equal(abstract, `${site}${base.replace(/\/$/, '')}${paperPath(sample)}`);
    assert.equal(pdf, `${abstract}paper.pdf`);
    assert.equal(paperFullTextPath(sample, base), new URL(pdf).pathname);
  }
  assert.equal(localPaperPdfPath(sample), '/pdfs/70.pdf');
  assert.equal(paperPdf(sample), '/pdfs/70.pdf');
});

test('draft, missing, unsafe and external PDFs cannot produce a local citation PDF URL', () => {
  for (const files of [
    undefined, {}, { draft: true, paper: '/pdfs/70.pdf' },
    { paper: 'javascript:alert(1)' }, { paper: '/pdfs/../../private.pdf' },
    { paper: 'https://publisher.example/paper.pdf' },
  ]) {
    const paper = { ...sample, files };
    assert.equal(localPaperPdfPath(paper), undefined);
    assert.deepEqual(values(paper, 'pdf_url'), []);
    assert.equal(paperFullTextPath(paper), files?.paper === 'https://publisher.example/paper.pdf' ? files.paper : undefined);
  }
});
