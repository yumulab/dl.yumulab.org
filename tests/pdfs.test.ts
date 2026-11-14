import assert from 'node:assert/strict';
import { open } from 'node:fs/promises';
import test from 'node:test';
import { papers, paperPdf } from '../src/lib/papers';
import type { Paper } from '../src/lib/papers';

function sample(paper?: string, draft = false): Paper {
  return { core: { id: 'sample', title: 'Sample' }, files: { paper, draft } };
}

test('PDF links support site-local paths and existing HTTPS sources', () => {
  assert.equal(paperPdf(sample('/pdfs/77.pdf')), '/pdfs/77.pdf');
  assert.equal(paperPdf(sample('/pdfs/new-paper.pdf')), '/pdfs/new-paper.pdf');
  assert.equal(paperPdf(sample('http://dl.yumulab.org/api/files/abc')), 'https://dl.yumulab.org/api/files/abc');
});

test('unpublished PDFs and executable or unsafe local paths are not linked', () => {
  assert.equal(paperPdf(sample('/pdfs/77.pdf', true)), undefined);
  assert.equal(paperPdf(sample()), undefined);
  assert.equal(paperPdf(sample('javascript:alert(1)')), undefined);
  assert.equal(paperPdf(sample('//example.com/paper.pdf')), undefined);
  assert.equal(paperPdf(sample('/pdfs/../secret.pdf')), undefined);
  assert.equal(paperPdf(sample('/pdfs/%2e%2e/secret.pdf')), undefined);
});

test('every registered public PDF exists locally as a complete PDF file', async () => {
  const registered = papers.filter((paper) => paper.files?.paper && !paper.files.draft);
  assert.ok(registered.length > 0);
  for (const paper of registered) {
    const url = paper.files!.paper!;
    assert.match(url, /^\/pdfs\/\d+\.pdf$/);
    const file = await open(new URL(`../public${url}`, import.meta.url));
    try {
      const { size } = await file.stat();
      assert.ok(size >= 100, `${paper.core.id}: PDF is empty`);
      const header = Buffer.alloc(5);
      await file.read(header, 0, header.length, 0);
      assert.equal(header.toString(), '%PDF-', `${paper.core.id}: invalid PDF header`);
      const tail = Buffer.alloc(Math.min(size, 4096));
      await file.read(tail, 0, tail.length, size - tail.length);
      assert.ok(tail.includes(Buffer.from('%%EOF')), `${paper.core.id}: incomplete PDF`);
    } finally {
      await file.close();
    }
  }
});
