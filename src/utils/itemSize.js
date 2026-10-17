// How a piece is measured depends on its category; the result is stored as one text value in the item's Size.
//   Bracelet / Necklace / Chain / Anklet → length in inches        "16 in"
//   Pendant / Earring                    → width × height in inches "0.5 × 0.7 in"
//   Ring                                 → ring size                 "13"
//   Bangle / Kada                        → inches-annas (1/16 inch)  "2-4"
//   anything else                        → free text

const KINDS = [
  { kind: 'length', words: ['bracelet', 'necklace', 'chain', 'anklet'] },
  { kind: 'wh', words: ['pendant', 'earring'] },
  { kind: 'ring', words: ['ring'] },
  { kind: 'bangle', words: ['bangle', 'kada'] },
];

/** Bangle sizes in inches-annas, 2-2 … 2-12 (1 anna = 1/16 inch). */
export const BANGLE_SIZES = ['2-2', '2-4', '2-6', '2-8', '2-10', '2-12'];

/** 'length' | 'wh' | 'ring' | 'bangle' | 'text' for a category name (e.g. "Earring" → 'wh'). */
export function sizeKind(category) {
  const name = String(category ?? '').toLowerCase();
  // "Earring" contains "ring", so pendants / earrings are checked before rings.
  return KINDS.find((k) => k.words.some((w) => (w === 'ring' ? /\bring\b/.test(name) : name.includes(w))))?.kind
    ?? 'text';
}

/** The stored Size text from its parts. */
export function formatSize(kind, parts) {
  const v = (x) => String(x ?? '').trim();
  switch (kind) {
    case 'length':
      return v(parts.length) && `${v(parts.length)} in`;
    case 'wh':
      return v(parts.width) || v(parts.height) ? `${v(parts.width)} × ${v(parts.height)} in` : '';
    default:
      return v(parts.value);
  }
}

/** Parts of a stored Size text, read back for editing (anything unexpected stays as plain text). */
export function parseSize(kind, text) {
  const s = String(text ?? '').trim();
  if (kind === 'length') return { length: s.replace(/\s*in(ch(es)?)?$/i, '') };
  if (kind === 'wh') {
    // Older sizes were saved in mm; either unit is read back as the two numbers.
    const m = s.replace(/\s*(mm|in(ch(es)?)?)$/i, '').split(/\s*[×x*]\s*/i);
    return { width: m[0] ?? '', height: m[1] ?? '' };
  }
  return { value: s };
}
