/**
 * Full screen photo viewer for the vehicle page (Jerry, 2026-11-26).
 *
 * The viewer it replaces was one image and two arrows. Shoppers swipe, so this one works
 * the way a phone's own photo app does:
 *
 *   swipe left or right   next and previous photo; the arrows and the keyboard still work
 *   pinch or double tap   zoom in, then drag to look around
 *   swipe down or up      close; the phone's Back button also closes it and stays on the page
 *
 * The gestures are PhotoSwipe 5 (MIT, no dependencies, exact version in package.json).
 * This module is imported on the first touch of the gallery, never with the page, so the
 * page weighs what it did. Only the photo on screen and its neighbours load.
 *
 * The photo address is the 1024/768 DealerCenter file, the one the phone strip already
 * shows: a photo the buyer has swiped past opens from the browser cache.
 */
import PhotoSwipe from 'photoswipe';
// Both style sheets travel inside this module as text (?inline) and go into the page when
// the viewer first opens. A plain CSS import would put a render blocking <link> on every
// vehicle page for a viewer most visits never open.
import baseCss from 'photoswipe/style.css?inline';
import viewerCss from './photo-viewer.css?inline';

export interface PhotoViewerOptions {
  /** Photo addresses in gallery order. */
  photos: string[];
  /** Photo to open on, counted from 0. */
  index: number;
  /** Vehicle name, for the image alt text. */
  title: string;
  /** Called once the viewer has closed, with the photo it was on. */
  onClose?: (index: number) => void;
}

// Same pattern as dc-image.ts: the /{width}/{height}/ part of a DealerCenter CDN address.
const DC_DIMS_RE = /\/(\d{2,4})\/(\d{2,4})\//;
const viewerSrc = (u: string): string =>
  u.includes('dealercenter.net') && DC_DIMS_RE.test(u) ? u.replace(DC_DIMS_RE, '/1024/768/') : u;

const HINT_KEY = 'maxim_photo_hint';
const HINT_TEXT = 'Swipe for the next photo. Pinch to zoom. Swipe down to close.';

function hintAlreadyShown(): boolean {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch (_) { return true; }
}
function rememberHint(): void {
  try { localStorage.setItem(HINT_KEY, '1'); } catch (_) { /* private mode: show it again next time */ }
}

function track(name: string, extra: Record<string, unknown>): void {
  const g = (window as any).gtag;
  if (typeof g === 'function') g('event', name, { page_type: 'vdp', transport_type: 'beacon', ...extra });
}

let isOpen = false;
let styled = false;

function addStyles(): void {
  if (styled) return;
  styled = true;
  const el = document.createElement('style');
  el.setAttribute('data-photo-viewer', '');
  el.textContent = `${baseCss} ${viewerCss}`;
  document.head.appendChild(el);
}

export function openPhotoViewer(o: PhotoViewerOptions): void {
  if (isOpen || !o.photos.length) return;
  isOpen = true;
  addStyles();

  const total = o.photos.length;
  const start = Math.max(0, Math.min(total - 1, Math.floor(o.index) || 0));
  // Every DealerCenter photo is 4:3. If one is not, loadComplete below corrects its slide.
  const items = o.photos.map((src, i) => ({
    src: viewerSrc(src),
    width: 1024,
    height: 768,
    alt: `${o.title} photo ${i + 1} of ${total}`,
  }));
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const pswp = new PhotoSwipe({
    dataSource: items,
    index: start,
    bgOpacity: 1,
    showHideAnimationType: 'fade',
    // One photo each side on a phone (data), one back and two ahead with a mouse.
    preload: touch ? [1, 1] : [1, 2],
    closeTitle: 'Close photos',
    zoomTitle: 'Zoom in or out',
    arrowPrevTitle: 'Previous photo',
    arrowNextTitle: 'Next photo',
    errorMsg: 'This photo did not load. Swipe to the next one.',
  });

  const seen = new Set<number>([start]);
  pswp.on('change', () => { seen.add(pswp.currIndex); });

  // A photo that is not 4:3 would be stretched to the declared shape. Read the real size
  // once it has loaded and rebuild that one slide.
  const corrected = new Set<number>();
  pswp.on('loadComplete', ({ content }) => {
    const el = content.element as HTMLImageElement | undefined;
    const i = content.index;
    if (!el || !el.naturalWidth || !el.naturalHeight || corrected.has(i)) return;
    if (Math.abs(el.naturalWidth / el.naturalHeight - content.width / content.height) < 0.02) return;
    corrected.add(i);
    items[i].width = el.naturalWidth;
    items[i].height = el.naturalHeight;
    pswp.refreshSlideContent(i);
  });

  // The Back button (and the Android back gesture) closes the viewer and stays on the page:
  // opening adds one history entry, closing any other way takes it out again.
  let closedByBack = false;
  const onPop = () => { closedByBack = true; pswp.close(); };
  history.pushState({ ...(history.state || {}), maximPhotos: true }, '');
  window.addEventListener('popstate', onPop);

  // First visit on a touch screen: say once what the gestures are.
  let hint: HTMLElement | null = null;
  let hintTimer = 0;
  const dropHint = () => {
    if (!hint) return;
    const el = hint;
    hint = null;
    window.clearTimeout(hintTimer);
    el.classList.remove('is-on');
    window.setTimeout(() => el.remove(), 350);
  };
  if (touch && total > 1 && !hintAlreadyShown()) {
    pswp.on('openingAnimationEnd', () => {
      if (!pswp.element || hint) return;
      hint = document.createElement('div');
      hint.className = 'maxim-photo-hint';
      hint.setAttribute('role', 'status');
      hint.textContent = HINT_TEXT;
      pswp.element.appendChild(hint);
      requestAnimationFrame(() => { if (hint) hint.classList.add('is-on'); });
      hintTimer = window.setTimeout(dropHint, 4500);
      rememberHint();
    });
    pswp.on('change', dropHint);
    pswp.on('zoomPanUpdate', () => { if (pswp.currSlide && pswp.currSlide.currZoomLevel > pswp.currSlide.zoomLevels.initial * 1.05) dropHint(); });
  }

  pswp.on('destroy', () => {
    window.removeEventListener('popstate', onPop);
    window.clearTimeout(hintTimer);
    if (!closedByBack && history.state && history.state.maximPhotos) history.back();
    isOpen = false;
    track('photo_viewer_close', { photos_seen: seen.size, photos_total: total });
    if (o.onClose) o.onClose(pswp.currIndex);
  });

  pswp.init();
  track('photo_viewer_open', { photo_number: start + 1, photos_total: total });
}
