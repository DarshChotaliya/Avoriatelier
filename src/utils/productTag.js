// QR tags for purchased pieces. The QR holds a link to the piece's public page (/p/<SKU>), which shows the piece and
// its metal value in every quality at today's rate — nothing private.
import logo from '../assets/avori-logo-black.png';
import qrcode from 'qrcode-generator';
import { formatWeight } from './purchaseCalc';

/** Link a tag's QR opens: this ERP's address + /p/<SKU>. */
export const productUrl = (skuNo, origin = window.location.origin) => `${origin}/p/${encodeURIComponent(skuNo)}`;

/** SKU from a /p/<SKU> address, or null for any other page. */
export const skuFromPath = (path = window.location.pathname) => {
  const m = /^\/p\/([^/]+)\/?$/.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
};

/** QR code as an SVG string (black squares, no margin; it scales to any size). */
export function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let path = '';
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
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

  .bf { width: 81mm; height: 12mm; }
  .half { width: 29mm; height: 12mm; flex: none; display: flex; align-items: center; }
  .front { justify-content: space-between; padding: 0 1.5mm 0 2.5mm; }
  .brand { width: 13mm; height: auto; flex: none; display: block; }
  .bf .qr { width: 10.5mm; height: 10.5mm; }
  .fold { width: 0; height: 12mm; flex: none; border-left: 0.35mm dashed #000; }
  .back { flex-direction: column; justify-content: center; align-items: flex-start; gap: 0.3mm; padding: 0 2mm;
    transform: rotate(180deg); font-size: 6.5pt; line-height: 1.15; white-space: nowrap; }
  .back b { font-size: 8.5pt; letter-spacing: 0.02em; }
  .tail { flex: 1; height: 12mm; }

  .fl { width: var(--w); height: var(--h); justify-content: space-between; gap: 1mm; padding: 0.8mm 1.2mm 0.8mm 2mm; }
  .fl-text { display: flex; flex-direction: column; justify-content: center; min-width: 0; height: 100%;
    font-size: calc(var(--h) * 0.17); line-height: 1.15; white-space: nowrap; letter-spacing: 0.03em; }
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
    document.getElementById('hint').textContent = 'Label ' + width + ' × ' + height
      + ' mm · pick that label stock on the label printer, margins none, scale 100%';
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
  const butterfly = items.map((it) => `
    <div class="tag bf">
      <div class="half front">
        <img class="brand" src="${logoUrl}" alt="AVORI">
        <span class="qr">${qrSvg(productUrl(it.skuNo))}</span>
      </div>
      <div class="fold"></div>
      <div class="half back">
        <b>${escape(it.skuNo)}</b>
        <span>Wt: ${formatWeight(it.netWeight)} g</span>
        <span>${escape(metalLabel(it.metalType, metalTypes))}</span>
      </div>
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
      <span class="qr">${qrSvg(productUrl(it.skuNo))}</span>
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
