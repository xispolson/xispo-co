/**
 * Flickr API helpers — all called at build time (no client-side requests).
 * Set FLICKR_API_KEY and FLICKR_USER_ID in your .env file.
 *
 * FLICKR_USER_ID can be found at: https://www.flickr.com/services/api/explore/?method=flickr.people.findByUsername
 * For user "xispo" you can also use the NSID directly once fetched.
 */

// Use process.env directly so Cloudflare Pages build picks these up reliably
const API_KEY   = (import.meta.env.FLICKR_API_KEY ?? process.env.FLICKR_API_KEY ?? '') as string;
const USER_ID   = (import.meta.env.FLICKR_USER_ID ?? process.env.FLICKR_USER_ID ?? '') as string;  // e.g. 12345678@N00
const BASE_URL  = 'https://api.flickr.com/services/rest';

export interface FlickrPhoto {
  id: string;
  title: string;
  url_m: string;   // medium (500px)
  url_l: string;   // large (1024px)
  url_c: string;   // 800px
  width_l: number;
  height_l: number;
}

function flickrImgUrl(photo: { id: string; server: string; secret: string; farm: number }, size = 'b'): string {
  // size: m=500, c=800, b=1024, h=1600, k=2048
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
}

async function fetchFlickr(method: string, params: Record<string, string> = {}): Promise<unknown> {
  if (!API_KEY) {
    console.warn('[flickr] FLICKR_API_KEY not set — skipping Flickr fetch');
    return null;
  }
  console.log(`[flickr] Fetching: ${method}`);

  const url = new URL(BASE_URL);
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('format', 'json');
  url.searchParams.set('nojsoncallback', '1');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Flickr API error: ${res.statusText}`);
  return res.json();
}

/** Get all public photos for the configured user (or a specific album). */
export async function getPhotos(options: {
  albumId?: string;
  count?: number;
  page?: number;
}): Promise<FlickrPhoto[]> {
  const { albumId, count = 50, page = 1 } = options;

  if (!API_KEY || !USER_ID) return [];

  const method   = albumId ? 'flickr.photosets.getPhotos' : 'flickr.people.getPublicPhotos';
  const params: Record<string, string> = {
    user_id: USER_ID,
    per_page: String(count),
    page: String(page),
    extras: 'url_m,url_l,url_c,o_dims,date_taken',
  };
  if (albumId) params['photoset_id'] = albumId;

  const data = await fetchFlickr(method, params) as Record<string, unknown>;
  if (!data) return [];

  // Response shape differs between endpoints
  const photos = albumId
    ? (data.photoset as Record<string, unknown>)?.photo
    : (data.photos as Record<string, unknown>)?.photo;

  if (!Array.isArray(photos)) return [];

  return photos.map((p: Record<string, unknown>) => ({
    id: String(p.id),
    title: String(p.title ?? ''),
    url_m: String(p.url_m ?? flickrImgUrl(p as Parameters<typeof flickrImgUrl>[0], 'm')),
    url_l: String(p.url_l ?? flickrImgUrl(p as Parameters<typeof flickrImgUrl>[0], 'b')),
    url_c: String(p.url_c ?? flickrImgUrl(p as Parameters<typeof flickrImgUrl>[0], 'c')),
    width_l:  Number(p.width_l  ?? 1024),
    height_l: Number(p.height_l ?? 768),
  }));
}

/** Pick a random photo from the collection for use as a hero. */
export async function getRandomHeroPhoto(albumId?: string): Promise<FlickrPhoto | null> {
  const photos = await getPhotos({ albumId, count: 100 });
  if (!photos.length) return null;
  return photos[Math.floor(Math.random() * photos.length)] ?? null;
}
