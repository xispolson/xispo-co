/**
 * Pre-build script: fetch Flickr data and write to src/data/ so Astro
 * can read it at prerender time without process.env inside Vite's context.
 *
 * Writes:
 *   src/data/hero.json   — single random photo for the homepage hero
 *   src/data/photos.json — array of photos for the /photos gallery page
 *
 * Called automatically by "npm run build" in package.json.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../src/data');

const API_KEY  = process.env.FLICKR_API_KEY ?? '';
const USER_ID  = process.env.FLICKR_USER_ID ?? '';
const ALBUM_ID = process.env.FLICKR_ALBUM_ID ?? '';

console.log('[flickr-fetch] FLICKR_API_KEY:', API_KEY ? `present (${API_KEY.length} chars)` : 'MISSING');
console.log('[flickr-fetch] FLICKR_USER_ID:', USER_ID || 'MISSING');
console.log('[flickr-fetch] FLICKR_ALBUM_ID:', ALBUM_ID || '(not set — using all public photos)');

mkdirSync(DATA_DIR, { recursive: true });

if (!API_KEY || !USER_ID) {
  console.warn('[flickr-fetch] Missing credentials — writing empty data.');
  writeFileSync(join(DATA_DIR, 'hero.json'), 'null', 'utf8');
  writeFileSync(join(DATA_DIR, 'photos.json'), '[]', 'utf8');
  process.exit(0);
}

const BASE = 'https://api.flickr.com/services/rest';

function imgUrl(p, size) {
  return `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_${size}.jpg`;
}

function toPhoto(p) {
  return {
    id:       String(p.id),
    title:    String(p.title ?? ''),
    url_m:    String(p.url_m ?? imgUrl(p, 'm')),
    url_l:    String(p.url_l ?? imgUrl(p, 'b')),
    url_c:    String(p.url_c ?? imgUrl(p, 'c')),
    width_l:  Number(p.width_l  ?? 1024),
    height_l: Number(p.height_l ?? 768),
  };
}

async function fetchPage(page, perPage = 100) {
  const method = ALBUM_ID ? 'flickr.photosets.getPhotos' : 'flickr.people.getPublicPhotos';
  const params = new URLSearchParams({
    method,
    api_key: API_KEY,
    user_id: USER_ID,
    per_page: String(perPage),
    page: String(page),
    extras: 'url_m,url_l,url_c,o_dims',
    format: 'json',
    nojsoncallback: '1',
  });
  if (ALBUM_ID) params.set('photoset_id', ALBUM_ID);

  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return ALBUM_ID ? data.photoset : data.photos;
}

try {
  console.log('[flickr-fetch] Fetching page 1...');
  const page1 = await fetchPage(1);

  if (!Array.isArray(page1?.photo) || page1.photo.length === 0) {
    console.warn('[flickr-fetch] No photos returned.');
    writeFileSync(join(DATA_DIR, 'hero.json'), 'null', 'utf8');
    writeFileSync(join(DATA_DIR, 'photos.json'), '[]', 'utf8');
    process.exit(0);
  }

  let allPhotos = page1.photo.map(toPhoto);

  // Fetch remaining pages if there are more (up to 500 photos max)
  const totalPages = Math.min(Number(page1.pages ?? 1), 5);
  for (let p = 2; p <= totalPages; p++) {
    console.log(`[flickr-fetch] Fetching page ${p}/${totalPages}...`);
    const pageData = await fetchPage(p);
    if (Array.isArray(pageData?.photo)) {
      allPhotos = allPhotos.concat(pageData.photo.map(toPhoto));
    }
  }

  console.log(`[flickr-fetch] Total photos: ${allPhotos.length}`);

  // Write full gallery
  writeFileSync(join(DATA_DIR, 'photos.json'), JSON.stringify(allPhotos, null, 2), 'utf8');

  // Pick random hero
  const hero = allPhotos[Math.floor(Math.random() * allPhotos.length)];
  writeFileSync(join(DATA_DIR, 'hero.json'), JSON.stringify(hero, null, 2), 'utf8');

  console.log(`[flickr-fetch] Hero: "${hero.title}" (${hero.id})`);
  console.log(`[flickr-fetch] Hero URL: ${hero.url_c}`);
} catch (err) {
  console.error('[flickr-fetch] Error:', err.message);
  writeFileSync(join(DATA_DIR, 'hero.json'), 'null', 'utf8');
  writeFileSync(join(DATA_DIR, 'photos.json'), '[]', 'utf8');
  process.exit(0);
}
