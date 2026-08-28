import { readdir, readFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const config = JSON.parse(await readFile(new URL('staticwebapp.config.json', dist), 'utf8'));
const routes = new Map(config.routes.map(route => [route.route, route.headers?.['Cache-Control']]));
const immutable = 'public, max-age=31536000, immutable';
const revalidate = 'public, max-age=0, must-revalidate';

if (routes.get('/assets/*') !== immutable) throw new Error('Static assets must be served with immutable one-year caching.');
if (config.globalHeaders?.['Cache-Control'] !== revalidate) throw new Error('Navigation fallbacks must revalidate instead of being immutable.');
for (const route of ['/index.html', '/sw.js', '/offline.html']) {
  if (routes.get(route) !== revalidate) throw new Error(`${route} must revalidate instead of being immutable.`);
}

const assets = await readdir(new URL('assets/', dist));
const cacheableAssets = assets.filter(name => /\.(?:js|css|avif|webp)$/.test(name));
if (!cacheableAssets.length || cacheableAssets.some(name => !/-[A-Za-z0-9_-]{8,}\.(?:js|css|avif|webp)$/.test(name))) {
  throw new Error('Every immutable JS, CSS, and hero image must have a content fingerprint in its filename.');
}
