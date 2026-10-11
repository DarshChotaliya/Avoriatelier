// SKU numbering (mirrors SkuFormatter in api/Services/SkuService.cs; the server gives out the real number):
//   Company prefix + item code + size + gender + running number, e.g. AV + RI + 14 + W + 00081 = AVRI14W00081.

export const DEFAULT_SKU_SETTINGS = { companyPrefix: 'AV', nameChars: 2, seqDigits: 5, separator: '', counter: 0 };

const alnum = (v) => String(v ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();

/** First letters / digits of the item name: "Ring" → "RI", "Nose Pin" → "NO". */
export const itemCode = (category, chars) => alnum(category).slice(0, chars);

/** The digits of the size: "14" → "14", "16 in" → "16", "2-4" → "24", "12 × 18 mm" → "1218". */
export const sizeCode = (size) => String(size ?? '').replace(/\D/g, '');

/** W (women), M (men), K (kids), otherwise U (unisex) — from the item's collection. */
export function genderCode(collection) {
  const c = String(collection ?? '').trim().toUpperCase();
  if (/^(WOM|LAD|GIRL)/.test(c)) return 'W';
  if (/^(MEN|MAN|GENT|BOY)/.test(c)) return 'M';
  if (/^(KID|CHILD)/.test(c)) return 'K';
  return 'U';
}

/**
 * The parts of a SKU, in order (empty ones are left out of the SKU). `item.shortCode` is the category's own short
 * form from the Item Categories master; without one the first letters of the name are used.
 */
export function skuParts(settings, item, sequence) {
  return [
    settings.companyPrefix,
    alnum(item.shortCode) || itemCode(item.category, settings.nameChars),
    sizeCode(item.size),
    genderCode(item.collection),
    String(sequence).padStart(settings.seqDigits, '0'),
  ];
}

export const buildSku = (settings, item, sequence) =>
  skuParts(settings, item, sequence).filter(Boolean).join(settings.separator);

/** The SKU the next new item would get: the counter moves on past any number already in use. */
export function nextSku(settings, item, taken, startAfter = settings.counter) {
  let sequence = startAfter;
  let sku;
  do {
    sequence += 1;
    sku = buildSku(settings, item, sequence);
  } while (taken.includes(sku));
  return { sku, sequence };
}
