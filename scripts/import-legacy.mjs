import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPath = path.join(root, 'src/data/papers.json');
const imagesOnly = process.argv.includes('--images-only');
const pdfsOnly = process.argv.includes('--pdfs-only');
const origin = 'https://dl.yumulab.org';
if (imagesOnly && pdfsOnly) throw new Error('Choose either --images-only or --pdfs-only');

async function request(url, timeout = 30_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
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
if (imagesOnly || pdfsOnly) {
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
const pending = pdfsOnly ? [] : [...papers];
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

if (!imagesOnly) {
  const targets = papers.filter((paper) => !paper.core.draft && paper.files?.paper && !paper.files.draft);
  const pendingPdfs = [...targets];
  const failures = [];
  let completed = 0;
  await mkdir(path.join(root, 'public/pdfs'), { recursive: true });

  function validatePdf(bytes, id) {
    if (bytes.length < 100 || bytes.subarray(0, 5).toString() !== '%PDF-'
        || !bytes.subarray(-4096).includes(Buffer.from('%%EOF'))) {
      throw new Error(`Invalid or incomplete PDF: ${id}`);
    }
  }

  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pendingPdfs.length) {
      const paper = pendingPdfs.shift();
      const id = paper.core.id;
      try {
        if (!/^\d+$/.test(id)) throw new Error(`Invalid paper ID: ${id}`);
        const localPath = `/pdfs/${id}.pdf`;
        const destination = path.join(root, 'public', localPath);
        const source = paper.files.paperSource || (paper.files.paper === localPath ? undefined : paper.files.paper);
        if (source) {
          const url = new URL(source.trim());
          if (url.hostname === 'dl.yumulab.org' && url.protocol === 'http:') url.protocol = 'https:';
          if (url.origin !== origin || !/^\/api\/files\/[a-f\d]+$/.test(url.pathname)) {
            throw new Error(`Unexpected PDF source: ${id}`);
          }
          for (let attempt = 1; ; attempt++) {
            try {
              const response = await request(url, 120_000);
              const bytes = Buffer.from(await response.arrayBuffer());
              validatePdf(bytes, id);
              const temporary = `${destination}.tmp`;
              try {
                await writeFile(temporary, bytes);
                await rename(temporary, destination);
              } finally {
                await rm(temporary, { force: true });
              }
              break;
            } catch (error) {
              if (attempt === 3) throw error;
              await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            }
          }
          paper.files.paperSource = url.href;
        } else {
          validatePdf(await readFile(destination), id);
        }
        paper.files.paper = localPath;
        completed++;
        if (completed % 10 === 0 || completed === targets.length) console.log(`PDFs saved: ${completed}/${targets.length}`);
      } catch (error) {
        failures.push(`${id}: ${error.message}`);
      }
    }
  }));
  if (failures.length) throw new Error(`PDF migration failed; metadata was not replaced.\n${failures.join('\n')}`);
  const temporary = `${dataPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(papers, null, 2)}\n`);
  await rename(temporary, dataPath);
  console.log(`${completed} PDFs saved locally; metadata updated.`);
}
if (!pdfsOnly) console.log(`${papers.length} public papers; thumbnails saved locally.`);
