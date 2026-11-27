// Self hosted WebP variants of a DealerCenter CDN photo, for cards and galleries.
//
// The DC CDN serves JPG only and builds its /{width}/{height}/ derivatives on demand; the
// small ones (640/480, 400/300) 404 from time to time while 1024/768 serves fine (see
// remote-image.ts, 2026-08-17). So every width here is cut by Astro/Sharp from the ONE
// 1024/768 derivative: one probe and one download per photo, and nothing the visitor loads
// depends on the CDN minting a small size at that moment.
//
// Why cards need it (site review, 2026-11-26): a phone at 3x picked the 1024 px JPG for a
// 359 px card, 183 KB each, 1.7 MB of an inventory grid. The 640 px WebP is about a third
// of that and still 1.8x the card.
//
// Same safety rule as the vehicle page hero: a URL goes to getImage() only after
// isRemoteImageAvailable() has just seen it return 200, because a 404 inside Astro's image
// queue aborts the whole build. Anything unconfirmed returns undefined and the caller
// keeps its plain <img>.
import { getImage } from 'astro:assets';
import { isRemoteImageAvailable } from './remote-image';

const DC_DIMS_RE = /\/(\d{2,4})\/(\d{2,4})\//;

export const isDcPhoto = (u: string): boolean => u.includes('dealercenter.net') && DC_DIMS_RE.test(u);
export const dcResize = (u: string, w: number, h: number): string => u.replace(DC_DIMS_RE, `/${w}/${h}/`);

const memo = new Map<string, Promise<string | undefined>>();

async function build(url: string, widths: number[]): Promise<string | undefined> {
  if (!isDcPhoto(url)) return undefined;
  const src = dcResize(url, 1024, 768);
  if (!(await isRemoteImageAvailable(src))) return undefined;
  const parts: string[] = [];
  for (const w of widths) {
    try {
      // Width only decides the resize (Astro keeps the source aspect when no `fit` is
      // given); height is passed because a remote image must declare both.
      const img = await getImage({ src, width: w, height: Math.round((w * 3) / 4), format: 'webp' });
      parts.push(`${img.src} ${w}w`);
    } catch (_) {
      // Registration failed for this width; the others still stand.
    }
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * "…/a.webp 400w, …/b.webp 640w, …/c.webp 1024w" for a DealerCenter photo URL, or undefined
 * when the photo is not a DC photo or could not be confirmed. Cached for the build, so a
 * car that appears on ten pages is probed and encoded once.
 */
export function dcWebpSrcset(url: string, widths: number[] = [400, 640, 1024]): Promise<string | undefined> {
  const key = `${url}|${widths.join(',')}`;
  let p = memo.get(key);
  if (!p) {
    p = build(url, widths);
    memo.set(key, p);
  }
  return p;
}
