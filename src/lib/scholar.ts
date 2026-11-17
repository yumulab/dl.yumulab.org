import type { Paper } from './papers';
import { localPaperPdfPath, paperPdf } from './papers';
import { paperPath } from './paper-urls';
import { withBase } from './urls';

export interface CitationMeta { name: string; content: string; }

/** Scholar requires the full-text PDF to be in the abstract page's directory. */
export function paperFullTextPath(paper: Paper, base = import.meta.env?.BASE_URL ?? '/'): string | undefined {
  return localPaperPdfPath(paper) ? withBase(`${paperPath(paper)}paper.pdf`, base) : paperPdf(paper);
}

function citationDate(value?: string): string | undefined {
  const date = value?.trim().match(/^(\d{4})(?:-(\d{2})-(\d{2})(?:T.*)?)?$/);
  return date ? [date[1], date[2], date[3]].filter(Boolean).join('/') : undefined;
}

/** Highwire Press tags supported by Google Scholar; omit unknown values. */
export function scholarMetadata(paper: Paper, site: URL | string, base = import.meta.env?.BASE_URL ?? '/'): CitationMeta[] {
  const { core, publication: pub } = paper;
  const tags: CitationMeta[] = [];
  const add = (name: string, value?: string) => {
    // Legacy imports contain stray control characters in names and publication titles.
    const content = value?.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (content) tags.push({ name: `citation_${name}`, content });
  };

  add('title', core.title);
  for (const author of core.authors ?? []) add('author', author);
  // sortingDate can be a news/record date, so it is never a publication-date fallback.
  add('publication_date', citationDate(pub?.publishedDate) || citationDate(core.presentationDate));
  add('language', core.language);
  add('abstract_html_url', new URL(withBase(paperPath(paper), base), site).href);

  const venue = pub?.bookTitle?.trim() || pub?.bookTitleAbbr;
  if (core.type === 'article-journal' || core.type === 'magazine' || core.type === 'report') {
    add('journal_title', venue);
  } else if (core.type === 'paper-conference' || core.type === 'domestic-conference' || core.type === 'international-conference') {
    add('conference_title', venue);
  }
  add('volume', pub?.volume);
  add('issue', pub?.issue || (core.type === 'article-journal' ? pub?.number : undefined));
  const pages = pub?.page?.trim().match(/^([^\s–—-]+)(?:\s*[-–—]\s*([^\s–—-]+))?$/);
  if (pages) {
    add('firstpage', pages[1]);
    add('lastpage', pages[2]);
  }
  add('publisher', pub?.publisher);
  add('issn', pub?.ISSN);
  add('isbn', pub?.ISBN);
  const doi = pub?.DOI?.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (doi && /^10\.\d{4,9}\/\S+$/i.test(doi)) add('doi', doi);

  // External URLs do not meet Scholar's same-directory requirement.
  if (localPaperPdfPath(paper)) add('pdf_url', new URL(paperFullTextPath(paper, base)!, site).href);
  return tags;
}
