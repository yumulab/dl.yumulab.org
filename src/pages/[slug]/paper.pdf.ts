import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { papers, localPaperPdfPath } from '../../lib/papers';
import { paperSlug } from '../../lib/paper-urls';

export const getStaticPaths = (() => papers.flatMap((paper) => {
  const source = localPaperPdfPath(paper);
  return source ? [{ params: { slug: paperSlug(paper) }, props: { source } }] : [];
})) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const source = resolve('public', `.${props.source}`);
  const bytes = await readFile(source);
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/pdf' } });
};
