import SelectBox from './SelectBox';
import { BANGLE_SIZES, formatSize, parseSize, sizeKind } from '../utils/itemSize';

const LABELS = {
  length: 'Length (inch)',
  wh: 'Width × Height (inch)',
  ring: 'Ring Size',
  bangle: 'Size (Anna)',
  text: 'Size',
};

/** The Size cell of a purchase item: its boxes follow the item's category (see utils/itemSize.js). */
function SizeField({ category, value, onChange, Cell }) {
  const kind = sizeKind(category);
  const parts = parseSize(kind, value);
  const set = (key) => (e) => onChange(formatSize(kind, { ...parts, [key]: e.target.value }));

  let control;
  if (kind === 'length') {
    control = (
      <input type="number" min="0" step="any" className="inv-num" placeholder="e.g. 16" value={parts.length}
        onChange={set('length')} />
    );
  } else if (kind === 'wh') {
    control = (
      <span className="ic-size-wh">
        <input type="number" min="0" step="any" className="inv-num" placeholder="W" aria-label="Width (inch)"
          value={parts.width} onChange={set('width')} />
        <span aria-hidden="true">×</span>
        <input type="number" min="0" step="any" className="inv-num" placeholder="H" aria-label="Height (inch)"
          value={parts.height} onChange={set('height')} />
      </span>
    );
  } else if (kind === 'bangle') {
    control = (
      <SelectBox value={parts.value} options={BANGLE_SIZES} allowEmpty placeholder="— Anna —" aria-label="Bangle size"
        onChange={(v) => onChange(v)} />
    );
  } else {
    control = (
      <input placeholder={kind === 'ring' ? 'e.g. 13' : 'Size'} value={parts.value} maxLength={50}
        onChange={set('value')} />
    );
  }

  return <Cell label={LABELS[kind]} className="ic-span-2">{control}</Cell>;
}

export default SizeField;
