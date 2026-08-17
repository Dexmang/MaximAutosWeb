// Build-time availability probe for remote (DealerCenter CDN) images.
//
// Why this exists: Astro's `getImage()` does NOT fetch the remote file at the
// call site. It only registers a transform; the actual download runs later, in
// the build's "generating optimized images" phase, inside Astro's own p-queue.
// A try/catch around `getImage()` therefore catches nothing, and a single 404
// aborts the whole build:
//
//   Error: Failed to load remote image https://imagesdl.dealercenter.net/640/480/...
//   The request did not return a 200 OK response. (received 404)
//   Command "cd site && npm ci && npm run build" exited with 1
//
// The DC CDN generates the /{width}/{height}/ derivatives on demand and is
// unreliable about it: on 2026-08-17 eight of one VIN's twelve photos 404'd at
// 640/480 while all twelve served fine at 1024/768, and a URL that 404'd during
// the 1:37 AM build returned 200 an hour later. Three production deploys died
// this way (2026-08-17 01:00, 01:37, 07:27 CDT).
//
// So we ask first, and only hand `getImage()` URLs we have just seen return 200.
// A URL we cannot positively confirm is skipped, and the caller falls back to
// the hotlinked JPG. Skipping costs one unoptimized hero image; guessing wrong
// costs the entire site.

const cache = new Map<string, Promise<boolean>>();

// The CDN rate limits concurrent probes and answers 404 to requests it sheds,
// which would look exactly like a genuinely missing image. Serialize every
// probe through one chain and space them out so a false negative can't quietly
// strip WebP from a car that actually has photos.
let queue: Promise<unknown> = Promise.resolve();
const GAP_MS = 120;
const TIMEOUT_MS = 10_000;

async function probe(url: string): Promise<boolean> {
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let res = await fetch(url, { method: 'HEAD', signal });
    // Some edges refuse HEAD outright; retry those with a ranged GET rather
    // than treating the method rejection as a missing file.
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return res.status === 200 || res.status === 206;
    }
    return res.status === 200;
  } catch {
    // Timeout, DNS, TLS, socket reset: unknown, not confirmed. Fail safe.
    return false;
  }
}

/**
 * True only when `url` was just confirmed to return 200. Anything else, including
 * a network error, returns false so the caller falls back to the plain <img>.
 * Results are cached for the life of the build; one probe per unique URL.
 */
export function isRemoteImageAvailable(url: string): Promise<boolean> {
  const hit = cache.get(url);
  if (hit) return hit;

  const result = queue.then(async () => {
    const ok = await probe(url);
    await new Promise(r => setTimeout(r, GAP_MS));
    return ok;
  });

  // Keep the chain alive even if a probe rejects, so one failure cannot stall
  // every later probe behind it.
  queue = result.catch(() => {});
  cache.set(url, result);
  return result;
}
