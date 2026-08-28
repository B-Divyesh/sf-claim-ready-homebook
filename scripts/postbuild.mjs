import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const indexUrl = new URL('../dist/index.html', import.meta.url);
const index = await readFile(indexUrl, 'utf8');
const initialAssets = [...index.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(match => match[1]);
const imageAssets = (await readdir(new URL('../dist/assets/', import.meta.url)))
  .filter(name => /^evidence-vault-.*\.(?:avif|webp)$/.test(name))
  .map(name => `/assets/${name}`);
const builtAssets = [...new Set([...initialAssets, ...imageAssets])];
const buildId = builtAssets.join('-').match(/[A-Za-z0-9_-]{8}/)?.[0] ?? Date.now().toString(36);
const workerUrl = new URL('../dist/sw.js', import.meta.url);
const worker = (await readFile(workerUrl, 'utf8'))
  .replace('__BUILD__', buildId)
  .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(builtAssets)};`);
await writeFile(workerUrl, worker);

for (const route of ['export', 'guide', 'privacy', 'terms']) {
  await mkdir(new URL(`../dist/${route}/`, import.meta.url), { recursive: true });
  await cp(indexUrl, new URL(`../dist/${route}/index.html`, import.meta.url));
}
