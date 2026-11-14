import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPath = path.join(root, 'src/data/papers.json');
const imagesOnly = process.argv.includes('--images-only');
const origin = 'https://dl.yumulab.org';

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}

function clean(value) {
  if (typeof value === 'string') return value.trim().replaceAll('http://dl.yumulab.org/', `${origin}/`);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]));
  return value;
}

let papers;
if (imagesOnly) {
  papers = JSON.parse(await readFile(dataPath, 'utf8'));
} else {
  papers = [];
  for (let skip = 0; ; skip += 15) {
    const url = new URL('/api/papers', origin);
    url.search = new URLSearchParams({ fields: '*', sort: JSON.stringify({ 'core.sortingDate': -1 }), skip: String(skip) }).toString();
    const page = await (await request(url)).json();
    if (!Array.isArray(page)) throw new Error('Expected an array of public papers');
    papers.push(...page);
    if (page.length < 15) break;
  }
  papers = clean(papers).filter((paper) => !paper.core.draft);
  if (!papers.length || new Set(papers.map((paper) => paper.core.id)).size !== papers.length) throw new Error('Invalid or duplicate paper records');
}

await mkdir(path.join(root, 'public/images/papers'), { recursive: true });
const pending = [...papers];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (pending.length) {
    const paper = pending.shift();
    const id = paper.core.id;
    if (!/^\d+$/.test(id)) throw new Error(`Invalid paper ID: ${id}`);
    const thumbnail = paper.core.thumbnailSmall || paper.core.thumbnail;
    if (!thumbnail) continue;
    const url = new URL(thumbnail);
    if (url.origin !== origin) throw new Error(`Unexpected image origin: ${url.origin}`);
    const response = await request(url);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Not an image: ${id}`);
    const image = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: 720, withoutEnlargement: true })
      .flatten({ background: '#fff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await writeFile(path.join(root, `public/images/papers/${id}.jpg`), image);
  }
}));

if (!imagesOnly) await writeFile(dataPath, `${JSON.stringify(papers, null, 2)}\n`);
console.log(`${papers.length} public papers; thumbnails saved locally.`);
