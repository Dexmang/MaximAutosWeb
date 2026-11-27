// A QR code as one compact inline SVG, made at build time. No script and no image request
// on the page.
//
// qrcode-generator (MIT, no dependencies of its own) builds the matrix. Its own SVG writer
// emits one path segment per dark module, about 38 KB for a 53 module code, so the drawing
// here merges each row's dark runs into single strokes instead: about 5 KB for the same code.
import qrcode from 'qrcode-generator';

// Text is encoded as UTF-8 so a car name with an accent still scans correctly. The library
// reads this function each time data is added; its own default is Latin 1.
(qrcode as any).stringToBytes = (s: string): number[] => Array.from(new TextEncoder().encode(s));

export function qrSvg(text: string, label: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4; // the quiet zone the QR standard asks for, in modules
  const size = n + quiet * 2;
  let d = '';
  for (let row = 0; row < n; row++) {
    let col = 0;
    while (col < n) {
      if (!qr.isDark(row, col)) { col++; continue; }
      let run = 1;
      while (col + run < n && qr.isDark(row, col + run)) run++;
      d += `M${col + quiet} ${row + quiet + 0.5}h${run}`;
      col += run;
    }
  }
  const safeLabel = label.replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${safeLabel}" width="100%" height="100%"><path fill="#fff" d="M0 0h${size}v${size}H0z"/><path stroke="#000" stroke-width="1" d="${d}"/></svg>`;
}
