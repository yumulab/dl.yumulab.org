import records from '../data/papers.json';
import { withBase } from './urls';

export const paperTypes = {
  'domestic-conference': { label: '国内学会', color: '#0199b4' },
  'international-conference': { label: '国際学会', color: '#165189' },
  'article-journal': { label: '論文誌', color: '#b3366a' },
  thesis: { label: '学位論文', color: '#7e57c2' },
  magazine: { label: '雑誌記事', color: '#b26a13' },
  'invited-ta': { label: '招待講演', color: '#477d25' },
  'panel-dis': { label: 'パネル討論', color: '#765d46' },
  presentation: { label: '予稿なし発表', color: '#477d25' },
} as const;

const legacyTypes: Record<string, string> = {
  'paper-conference': 'domestic-conference',
  report: 'domestic-conference',
  talk: 'presentation',
};

export interface PaperAward {
  name: string;
  sourceUrl: string;
}

export interface Paper {
  core: {
    id: string;
    type?: string;
    title: string;
    titleOfEnglish?: string;
    authors?: string[];
    abstract?: string;
    keywords?: string[];
    language?: string;
    externalUrl?: string;
    thumbnail?: string;
    thumbnailSmall?: string;
    presentationlLocation?: string;
    presentationDate?: string;
    sortingDate?: string;
    draft?: boolean;
  };
  files?: { draft?: boolean; paper?: string; paperSource?: string };
  publication?: {
    bookTitle?: string;
    bookTitleAbbr?: string;
    publishedDate?: string;
    volume?: string;
    issue?: string;
    number?: string;
    page?: string;
    publisher?: string;
    copyrightHolder?: string;
    DOI?: string;
    ISSN?: string;
    ISBN?: string;
  };
  embed?: { slideshare?: string; youtube?: string };
  external?: { links?: string[] };
  awards?: PaperAward[];
}

export const papers: Paper[] = (records as Paper[]).filter((paper) => !paper.core.draft);

export function paperType(paper: Paper): keyof typeof paperTypes | 'other' {
  const { type, language } = paper.core;
  if (type === 'article-journal') return 'article-journal';
  if (language === 'en') return 'international-conference';
  if (type === 'paper-conference' || type === 'report') return 'domestic-conference';
  if (type === 'talk') return 'presentation';
  return type && Object.hasOwn(paperTypes, type) ? type as keyof typeof paperTypes : 'other';
}

export function typeInfo(type = ''): { label: string; color: string } {
  return Object.hasOwn(paperTypes, type)
    ? paperTypes[type as keyof typeof paperTypes]
    : { label: 'その他', color: '#616161' };
}

export function paperDate(paper: Paper): string {
  return (paper.core.sortingDate || paper.core.presentationDate || paper.publication?.publishedDate || '').slice(0, 10);
}

/** Japanese academic year: April through March, named for the starting year. */
export function paperFiscalYear(paper: Paper): string {
  const date = paperDate(paper);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const month = Number(date.slice(5, 7));
  if (month < 1 || month > 12) return '';
  return String(Number(date.slice(0, 4)) - (month < 4 ? 1 : 0));
}

/** Group sorted results without changing the fiscal year or paper order. */
export function groupPapersByFiscalYear(sorted: Paper[]): { year: string; papers: Paper[] }[] {
  const groups = new Map<string, Paper[]>();
  for (const paper of sorted) {
    const year = paperFiscalYear(paper);
    const group = groups.get(year);
    if (group) group.push(paper);
    else groups.set(year, [paper]);
  }
  return [...groups].map(([year, papers]) => ({ year, papers }));
}

export function formatDate(value?: string): string {
  return value ? value.slice(0, 10).replaceAll('-', '/') : '—';
}

export function thumbnail(paper: Paper): string {
  return paper.core.thumbnailSmall || paper.core.thumbnail
    ? withBase(`/images/papers/${paper.core.id}.jpg`)
    : withBase('/images/paper-placeholder.svg');
}

export function paperPdf(paper: Paper): string | undefined {
  if (paper.files?.draft) return undefined;
  const value = paper.files?.paper?.trim();
  if (!value) return undefined;
  if (/^\/pdfs\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(value)) return withBase(value);
  return safeUrl(value);
}

export function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim();
}

export function searchText(paper: Paper): string {
  return normalize([
    paper.core.title, paper.core.titleOfEnglish, ...(paper.core.authors ?? []),
    paper.core.abstract, ...(paper.core.keywords ?? []), paper.publication?.bookTitle,
    paper.publication?.bookTitleAbbr, typeInfo(paperType(paper)).label,
    ...(paper.awards ?? []).map((award) => award.name),
  ].filter(Boolean).join(' '));
}

export interface Filters {
  q: string;
  year: string;
  type: string;
  sort: 'newest' | 'oldest';
  view: 'list' | 'grid' | 'text';
}

export function readFilters(params: URLSearchParams): Filters {
  const year = params.get('year') ?? '';
  const requestedType = params.get('type') ?? '';
  const type = Object.hasOwn(legacyTypes, requestedType) ? legacyTypes[requestedType] : requestedType;
  const view = params.get('view');
  return {
    q: params.get('q') ?? '',
    year: /^\d{4}$/.test(year) ? year : '',
    type: Object.hasOwn(paperTypes, type) || type === 'other' ? type : '',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    view: view === 'list' || view === 'text' ? view : 'grid',
  };
}

export function filterPapers(all: Paper[], filters: Filters): Paper[] {
  const terms = normalize(filters.q).split(' ').filter(Boolean);
  return all.filter((paper) =>
    terms.every((term) => searchText(paper).includes(term)) &&
    (!filters.year || paperFiscalYear(paper) === filters.year) &&
    (!filters.type || paperType(paper) === filters.type),
  ).sort((a, b) => {
    const dateOrder = paperDate(a).localeCompare(paperDate(b));
    return (filters.sort === 'oldest' ? dateOrder : -dateOrder) || Number(a.core.id) - Number(b.core.id);
  });
}

export function citation(paper: Paper): string {
  const p = paper.publication;
  return [
    `${(paper.core.authors ?? []).join(', ')}.`, paper.core.title,
    p?.bookTitle, p?.volume && `Vol.${p.volume}`, p?.issue && `Issue.${p.issue}`,
    p?.number && `No.${p.number}`, p?.page && `pp.${p.page}`,
    (p?.publishedDate || paperDate(paper)).slice(0, 4),
  ].filter(Boolean).join(', ').replace('.,', '.');
}

export function safeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol)) return undefined;
    if (url.hostname === 'dl.yumulab.org') url.protocol = 'https:';
    return url.href;
  } catch { return undefined; }
}

export function embedUrl(value?: string): string | undefined {
  const url = safeUrl(value);
  if (!url) return undefined;
  const parsed = new URL(url);
  if (['www.youtube.com', 'youtube.com', 'youtu.be'].includes(parsed.hostname)) {
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (parsed.hostname === 'speakerdeck.com' && /^\/player\/[a-f0-9]+$/.test(parsed.pathname)) return url;
  if (['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'].includes(parsed.hostname)
      && /^\/embed\/[\w-]+$/.test(parsed.pathname)) return url;
  return undefined;
}
