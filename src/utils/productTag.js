// QR tags for purchased pieces. The QR holds a link to the piece's public page (/p/<SKU>), which shows the piece and
// its metal value in every quality at today's rate — nothing private.
// The tag logo is the same wordmark with its strokes grown by a hair (see src/assets): the normal logo's hairline serifs
// are thinner than a printer dot and came out faint, but a 1-bit cut-out of it lost the letter shapes.
import logo from '../assets/avori-logo-tag.png';
import { PUBLIC_SITE_URL } from '../constants/company';
import qrcode from 'qrcode-generator';
import { formatWeight } from './purchaseCalc';

/** Link a tag's QR opens: this ERP's address + /p/<SKU>. */
// localhost, 127.x, 10.x, 192.168.x and 172.16-31.x: addresses that only work on this computer or its own network.
const isPrivateHost = (host) => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$)/i.test(host)
  || host.endsWith('.local');

/** The address a tag's QR points at: this site when it is public, otherwise the public site (see PUBLIC_SITE_URL). */
export const tagOrigin = (loc = window.location) => (isPrivateHost(loc.hostname) ? PUBLIC_SITE_URL : loc.origin);

export const productUrl = (skuNo, origin = tagOrigin()) => `${origin}/p/${encodeURIComponent(skuNo)}`;

/**
 * What a tag's QR holds: the same address in capitals. Capitals, digits and  : / . -  fit the QR alphanumeric mode,
 * which packs 42 characters into the 25 x 25 version (the mixed-case address needs 29 x 29). Fewer, bigger modules
 * print and scan far better on a 12 mm label; hosts and the /p/ page ignore the case.
 */
export const tagQrText = (skuNo, origin = tagOrigin()) => productUrl(skuNo, origin).toUpperCase();

/** SKU from a /p/<SKU> address, or null for any other page. */
export const skuFromPath = (path = window.location.pathname) => {
  const m = /^\/p\/([^/]+)\/?$/i.exec(path); // a tag QR holds the address in capitals (see tagQrText)
  return m ? decodeURIComponent(m[1]) : null;
};

/**
 * QR code as an SVG string (black squares; it scales to any size). It carries its own white quiet zone of 2 modules
 * all round, so it is centred in whatever box it sits in and a scanner finds its edges even next to a fold line or
 * the logo. Error correction L keeps the code small (fewer, bigger modules) for a tiny label.
 */
export function qrSvg(text) {
  const qr = qrcode(0, 'L');
  qr.addData(text, /^[0-9A-Z $%*+\-./:]+$/.test(text) ? 'Alphanumeric' : 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  let path = '';
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
  }
  const quiet = 2;
  const side = n + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">`
    + `<rect width="${side}" height="${side}" fill="#fff"/><path transform="translate(${quiet} ${quiet})" d="${path}"/></svg>`;
}

/**
 * Pixels per QR module in the tag's QR picture: 3, the 3 dots a module gets on a 203 dpi label printer, so the picture
 * (27 x 3 = 81 px for 10.125 mm) is printed 1:1 and the driver never has to resample it into grey dots.
 */
const QR_PX = 3;
/** White modules round the QR picture. 1 (the label itself is white round it) leaves more of the 12 mm for moving it up. */
const QR_QUIET = 1;

/**
 * The tag's QR as a PNG data URL (null where there is no canvas). A tag prints through the printer driver's rasteriser,
 * which smudges the many thin shapes of a vector QR; one pre-drawn bitmap is only scaled, so its square modules stay
 * sharp (the same approach as the Carat Quest tags). 2 white modules all round are the quiet zone.
 */
export function qrPng(text) {
  try {
    const qr = qrcode(0, 'L');
    qr.addData(text, /^[0-9A-Z $%*+\-./:]+$/.test(text) ? 'Alphanumeric' : 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const quiet = QR_QUIET;
    const side = (n + quiet * 2) * QR_PX;
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, side, side);
    ctx.fillStyle = '#000';
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * QR_PX, (r + quiet) * QR_PX, QR_PX, QR_PX);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** The QR as markup for a tag: the PNG, or the vector one when there is no canvas. */
const qrMarkup = (text) => {
  const png = qrPng(text);
  return png ? `<img src="${png}" alt="QR">` : qrSvg(text);
};

/**
 * The lines of text drawn as one solid-black bold picture (about 1200 dpi). Small live text prints light on a thermal
 * head, because its anti-aliased grey edges are dots the printer never fires; a pre-drawn black bitmap prints dark.
 * Returns { url, w, h } (w, h in mm) or null where there is no canvas.
 */
export function textImage(lines) {
  try {
    const dpmm = 48;
    const px = (pt) => pt * 0.35278 * dpmm;
    const gap = 0.5 * dpmm; // space between the ink of two lines
    const pad = 0.3 * dpmm;
    const font = (pt) => `700 ${px(pt)}px Arial, Helvetica, sans-serif`;
    const canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Measure the ink of every line (not the font's em box): the lines all start at the same left edge, like the Carat
    // Quest tags, and the block has the same margin above its first line as below its last.
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const m = lines.map((l) => {
      ctx.font = font(l.pt);
      const t = ctx.measureText(l.text);
      return {
        ...l, left: t.actualBoundingBoxLeft, ink: t.actualBoundingBoxLeft + t.actualBoundingBoxRight,
        up: t.actualBoundingBoxAscent, down: t.actualBoundingBoxDescent,
      };
    });
    const widest = Math.max(...m.map((l) => l.ink));
    canvas.width = Math.ceil(widest + pad * 2);
    canvas.height = Math.ceil(pad * 2 + m.reduce((sum, l) => sum + l.up + l.down, 0) + gap * (m.length - 1));
    ctx = canvas.getContext('2d'); // resizing resets the context
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    let y = pad;
    m.forEach((l) => {
      ctx.font = font(l.pt);
      ctx.fillText(l.text, pad + l.left, y + l.up);
      y += l.up + l.down + gap;
    });
    return { url: canvas.toDataURL('image/png'), w: canvas.width / dpmm, h: canvas.height / dpmm };
  } catch {
    return null;
  }
}

/** Metal line on the tag, e.g. "925 STERLING SILVER" or "18KT GOLD". */
export function metalLabel(metalType, metalTypes = []) {
  const name = String(metalType ?? '').trim();
  if (/^S?925$/i.test(name)) return '925 STERLING SILVER';
  const metal = metalTypes.find((m) => m.name === name)?.metal;
  return [name, metal && !name.toUpperCase().includes(metal.toUpperCase()) ? metal : null]
    .filter(Boolean).join(' ').toUpperCase();
}

/** Short metal mark for a flag tag, e.g. "925", "14K", "18K". */
export function metalShort(metalType) {
  const name = String(metalType ?? '').trim().toUpperCase();
  if (/^S?925$/.test(name)) return '925';
  const kt = /^(\d{1,2})\s*K/.exec(name);
  return kt ? `${kt[1]}K` : name;
}

const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// Styles of the preview window. Butterfly: 81 × 12 mm, folds. Flag: one side, size from the boxes (--w × --h).
const TAG_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .tag { display: flex; align-items: center; overflow: hidden; background: #fff; page-break-after: always;
    break-after: page; }
  body.flag .bf, body.butterfly .fl { display: none; }
  .qr { flex: none; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .qr img { width: 100%; height: 100%; display: block; image-rendering: pixelated; image-rendering: crisp-edges; }

  .bf { width: 81mm; height: 12mm; }
  /* Fixed position, found right on the label printer by trying: everything (logo, QR and text together, so they stay
     level) sits 0.5 mm above the middle of the 12 mm page. The Carat Quest tags lift theirs by 0.75 mm the same way. */
  .bf > * { position: relative; top: -0.5mm; }
  /* Each half of the folded tag is 27 mm, like the Carat Quest tags that print right on this printer. */
  .half { width: 27mm; height: 12mm; flex: none; display: flex; align-items: center; }
  /* Printed test: the logo ran up to the outer edge of the label (1 mm) where the Carat Quest tag keeps about 4 mm. The
     logo is smaller and starts 3.5 mm in; the QR then sits 1.4 mm after it, with its own white margin to the fold. */
  .front { justify-content: flex-start; gap: 0.9mm; padding: 0 0 0 2mm; }
  .brand { width: 12.5mm; height: auto; flex: none; display: block; }
  /* 27 modules (25 + 1 white module each side), 9.07 mm: the QR itself is 8.4 mm. Printed test (client photo): the label is
     12.4 mm tall but the driver starts the 12 mm page about 1.8 mm below its top edge, so the part of the page that lands
     on the label runs from -1.8 to 10.6 mm and its middle is 4.3 mm; a 9.4 mm QR cannot be centred there (the page
     cannot be printed above 0), an 8.4 mm one can. */
  .bf .qr { width: 9.07mm; height: 9.07mm; }
  /* The fold line as on the Carat Quest tags: 10 mm tall, 0.5 mm dashed. */
  .fold { width: 0; height: 10mm; flex: none; border-left: 0.5mm dashed #000; }
  /* The details, bold and centred in the half, turned 180° so they read the right way once folded. They are one
     solid-black picture (see textImage); the live text below is only the fallback. */
  .back { justify-content: center; }
  .details { display: flex; flex-direction: column; align-items: flex-start; gap: 0.3mm; flex: none;
    transform: rotate(180deg); font-size: 6.6pt; font-weight: 700; line-height: 1.15; white-space: nowrap; }
  .details b { font-size: 8.4pt; letter-spacing: 0.02em; }
  .details img { display: block; }
  .tail { flex: 1; height: 12mm; }

  .fl { width: var(--w); height: var(--h); justify-content: space-between; gap: 1mm; padding: 0.8mm 1.2mm 0.8mm 2mm; }
  .fl-text { display: flex; flex-direction: column; justify-content: center; min-width: 0; height: 100%;
    font-size: calc(var(--h) * 0.17); font-weight: 700; line-height: 1.15; white-space: nowrap; letter-spacing: 0.03em; }
  .fl-brand { margin-top: 0.7mm; height: calc(var(--h) * 0.19); width: auto; align-self: flex-start; display: block; }
  .fl .qr { width: calc(var(--h) - 1.6mm); height: calc(var(--h) - 1.6mm); }

  .bar { display: none; }
  @media screen {
    body { min-height: 100vh; background: #9aa1ac; }
    .bar { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 22px 16px 8px; color: #fff; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; font-size: 14px; }
    .seg { gap: 0; }
    .seg button { padding: 8px 14px; border: 1px solid #fff; background: transparent; color: #fff;
      font: 600 14px Arial, sans-serif; cursor: pointer; }
    .seg button:first-child { border-radius: 8px 0 0 8px; }
    .seg button:last-child { border-radius: 0 8px 8px 0; }
    .seg button.on { background: #fff; color: #04443b; }
    .size input { width: 64px; padding: 6px; border: 0; border-radius: 6px; font: 600 14px Arial, sans-serif;
      text-align: right; }
    body.butterfly .size { display: none; }
    .print { padding: 12px 24px; border: 0; border-radius: 8px; font: 700 18px Arial, sans-serif; color: #fff;
      background: #04443b; cursor: pointer; }
    .bar p { margin: 0; font-size: 13px; text-align: center; }
    .sheet { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; zoom: 2.6; }
    .tag { border-radius: 1.5mm; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25); }
    .tail { background: #d3d7de; }
  }`;

// Preview window script: switches style and flag size, sets the printed page size, remembers the choice.
const TAG_SCRIPT = `
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
  let style = get('avori.tagStyle', 'butterfly');
  const w = document.getElementById('w');
  const h = document.getElementById('h');
  w.value = get('avori.flagW', '32');
  h.value = get('avori.flagH', '13');
  function apply() {
    document.body.className = style;
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.style === style));
    const width = style === 'flag' ? w.value : '81';
    const height = style === 'flag' ? h.value : '12';
    document.body.style.setProperty('--w', w.value + 'mm');
    document.body.style.setProperty('--h', h.value + 'mm');
    document.getElementById('page').textContent = '@page { size: ' + width + 'mm ' + height + 'mm; margin: 0; }';
    document.getElementById('hint').textContent = style === 'flag'
      ? 'Label ' + width + ' × ' + height + ' mm · pick that label stock on the label printer, margins none, scale 100%'
      : 'Printable area: 81 × 12 mm (matches the label stock 81-12 of the printer driver, which handles the label gap)'
        + ' · content sits left, rest of the width is blank stock';
    put('avori.tagStyle', style);
    put('avori.flagW', w.value);
    put('avori.flagH', h.value);
  }
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    style = b.dataset.style;
    apply();
  }));
  w.addEventListener('input', apply);
  h.addEventListener('input', apply);
  apply();`;

/**
 * Opens a print preview of jewellery tags, one per label, in two styles to switch between:
 *  - Butterfly (81 × 12 mm): AVORI + QR, a dashed fold, then SKU / weight / metal upside down so both halves read the
 *    right way once folded round the piece; the thin tail stays blank.
 *  - Flag (default 32 × 13 mm, size editable): one side only, SKU / weight / metal / AVORI on the left and the QR on
 *    the right, like a CRAFT flag tag.
 * The style and flag size are remembered in this browser. Print from the button (or Ctrl+P) on the label printer.
 */
export function printTags(items, metalTypes = []) {
  // The preview opens in a blank window, so the logo needs its full address.
  const logoUrl = new URL(logo, window.location.href).href;
  // SKU, weight and metal of a butterfly tag's back half.
  const detailsBlock = (it) => {
    const metal = metalLabel(it.metalType, metalTypes);
    const weight = `Wt: ${formatWeight(it.netWeight)} g`;
    const img = textImage([{ text: it.skuNo, pt: 8.4 }, { text: weight, pt: 6.6 }, { text: metal, pt: 5.6 }]);
    return img
      ? `<div class="details"><img src="${img.url}" style="width:${img.w.toFixed(2)}mm;height:${img.h.toFixed(2)}mm" alt=""></div>`
      : `<div class="details"><b>${escape(it.skuNo)}</b><span>${escape(weight)}</span><span>${escape(metal)}</span></div>`;
  };
  const butterfly = items.map((it) => `
    <div class="tag bf">
      <div class="half front">
        <img class="brand" src="${logoUrl}" alt="AVORI">
        <span class="qr">${qrMarkup(tagQrText(it.skuNo))}</span>
      </div>
      <div class="fold"></div>
      <div class="half back">${detailsBlock(it)}</div>
      <div class="tail"></div>
    </div>`).join('');
  const flag = items.map((it) => `
    <div class="tag fl">
      <div class="fl-text">
        <span>${escape(it.skuNo)}</span>
        <span>${formatWeight(it.netWeight)} g</span>
        <span>${escape(metalShort(it.metalType))}</span>
        <img class="fl-brand" src="${logoUrl}" alt="AVORI">
      </div>
      <span class="qr">${qrMarkup(tagQrText(it.skuNo))}</span>
    </div>`).join('');
  const count = `${items.length} tag${items.length === 1 ? '' : 's'}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print ${count}</title>
    <style id="page"></style><style>${TAG_CSS}</style></head><body class="butterfly">
    <div class="bar">
      <div class="row seg">
        <button type="button" data-style="butterfly">Butterfly 81 × 12 (folds)</button>
        <button type="button" data-style="flag">Flag (one side)</button>
      </div>
      <div class="row size">Flag size
        <input id="w" type="number" min="15" max="100" step="0.5"> ×
        <input id="h" type="number" min="8" max="40" step="0.5"> mm
      </div>
      <button type="button" class="print" onclick="window.print()">&#128424; Print ${count}</button>
      <p id="hint"></p>
    </div>
    <div class="sheet">${butterfly}${flag}</div>
    <script>${TAG_SCRIPT}</script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
