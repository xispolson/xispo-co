/**
 * Pre-build script: fetch a random hero photo from Flickr and write to
 * src/data/hero.json so Astro can read it at prerender time without needing
 * process.env inside Vite's bundled context.
 *
 * Run via: node scripts/fetch-hero.mjs
 * (called automatically by the build script in package.json)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../src/data/hero.json');

const API_KEY  = process.env.FLICKR_API_KEY ?? '';
const USER_ID  = process.env.FLICKR_USER_ID ?? '';
const ALBUM_ID = process.env.FLICKR_ALBUM_ID ?? '';

console.log('[hero-fetch] FLICKR_API_KEY:', API_KEY ? `present (${API_KEY.length} chars)` : 'MISSING');
console.log('[hero-fetch] FLICKR_USER_ID:', USER_ID || 'MISSING');
console.log('[hero-fetch] FLICKR_ALBUM_ID:', ALBUM_ID || '(not set — using all public photos)');

// Ensure output directory exists
mkdirSync(join(__dirname, '../src/data'), { recursive: true });

if (!API_KEY || !USER_ID) {
  console.warn('[hero-fetch] Missing Flickr credentials — writing null hero.');
  writeFileSync(OUT_FILE, 'null', 'utf8');
  process.exit(0);
}

const BASE = 'https://api.flickr.com/services/rest';
const method = ALBUM_ID ? 'flickr.photosets.getPhotos' : 'flickr.people.getPublicPhotos';

const params = new URLSearchParams({
  method,
  api_key: API_KEY,
  user_id: USER_ID,
  per_page: '100',
  page: '1',
  extras: 'url_m,url_l,url_c,o_dims',
  format: 'json',
  nojsoncallback: '1',
});
if (ALBUM_ID) params.set('photoset_id', ALBUM_ID);

console.log(`[hero-fetch] Fetching: ${method}`);

try {
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();

  const photos = ALBUM_ID
    ? data.photoset?.photo
    : data.photos?.photo;

  if (!Array.isArray(photos) || photos.length === 0) {
    console.warn('[hero-fetch] No photos returned from Flickr.');
    writeFileSync(OUT_FILE, 'null', 'utf8');
    process.exit(0);
  }

  const pick = photos[Math.floor(Math.random() * photos.length)];

  function imgUrl(p, size) {
    return `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_${size}.jpg`;
  }

  const hero = {
    id:       String(pick.id),
    title:    String(pick.title ?? ''),
    url_m:    String(pick.url_m ?? imgUrl(pick, 'm')),
    url_l:    String(pick.url_l ?? imgUrl(pick, 'b')),
    url_c:    String(pick.url_c ?? imgUrl(pick, 'c')),
    width_l:  Number(pick.width_l  ?? 1024),
    height_l: Number(pick.height_l ?? 768),
  };

  writeFileSync(OUT_FILE, JSON.stringify(hero, null, 2), 'utf8');
  console.log(`[hero-fetch] Hero selected: "${hero.title}" (${hero.id})`);
  console.log(`[hero-fetch] URL: ${hero.url_l}`);
} catch (err) {
  console.error('[hero-fetch] Error:', err.message);
  writeFileSync(OUT_FILE, 'null', 'utf8');
  process.exit(0); // don't fail the whole build
}
