import registeredSlugs from '../data/paper-slugs.json';
import type { Paper } from './papers';

export const paperSlugs: Readonly<Record<string, string>> = registeredSlugs;

const used = new Set<string>();
for (const [id, slug] of Object.entries(paperSlugs)) {
  if (!/^\d+$/.test(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug)) {
    throw new Error(`Invalid paper URL registration: ${id} → ${slug}`);
  }
  if (used.has(slug)) throw new Error(`Duplicate paper URL: ${slug}`);
  used.add(slug);
}

export function paperSlug(paper: Paper): string {
  const slug = paperSlugs[paper.core.id];
  if (!slug) {
    throw new Error(`Add a conference-author slug for paper ${paper.core.id} to src/data/paper-slugs.json`);
  }
  return slug;
}

export function paperPath(paper: Paper): string {
  return `/${paperSlug(paper)}/`;
}
