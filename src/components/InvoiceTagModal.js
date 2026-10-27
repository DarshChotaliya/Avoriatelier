import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { formatWeight } from '../utils/purchaseCalc';
import './PurchaseInvoice.css';
import './InvoiceTagModal.css';

const GENDERS = [
  { key: 'W', label: 'Women' },
  { key: 'M', label: 'Men' },
  { key: 'K', label: 'Kids' },
  { key: 'U', label: 'Unisex' },
];

/** W / M / K / U from the item's collection, else from the letter before the SKU's counter (AVRNGW00008 → W). */
export function genderOf(item) {
  const c = String(item.collection || '').toUpperCase();
  if (/WOMEN|LADIES|FEMALE/.test(c)) return 'W';
  if (/\bMEN\b|GENTS|MALE/.test(c)) return 'M';
  if (/KID|CHILD|BABY/.test(c)) return 'K';
  if (/UNISEX/.test(c)) return 'U';
  const m = String(item.skuNo || '').toUpperCase().match(/([WMKU])\d{5}$/);
  return m ? m[1] : '';
}

/**
 * The print-tags dialog of one purchase invoice. It first asks: every tag of the invoice, or a custom pick. Custom lists
 * the invoice's SKUs with a tick box (Shift+click ticks a whole run), filtered by Women / Men / Kids and by category, with a
 * search; only the ticked SKUs are printed.
 */
function InvoiceTagModal({ invoiceNo, items, onPrint, onClose }) {
  const [mode, setMode] = useState('ask'); // ask | custom
  const [picked, setPicked] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const lastClicked = useRef(null); // SKU of the last row clicked, for Shift+click runs

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const genderCounts = useMemo(() => {
    const n = {};
    items.forEach((i) => { const g = genderOf(i); n[g] = (n[g] || 0) + 1; });
    return n;
  }, [items]);
  const categories = useMemo(() => {
    const n = new Map();
    items.forEach((i) => { const c = i.category || '—'; n.set(c, (n.get(c) || 0) + 1); });
    return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    return items.filter((i) => (!gender || genderOf(i) === gender)
      && (!category || (i.category || '—') === category)
      && (!t || `${i.skuNo} ${i.category || ''} ${i.designCode || ''}`.toLowerCase().includes(t)));
  }, [items, search, gender, category]);
  const chosen = items.filter((i) => picked.has(i.skuNo));
  const allShownPicked = shown.length > 0 && shown.every((i) => picked.has(i.skuNo));

  // A click ticks / unticks one row; Shift+click gives every row from the last clicked one to this one the same state.
  const clickRow = (sku, shift) => {
    const on = !picked.has(sku);
    const from = shown.findIndex((i) => i.skuNo === lastClicked.current);
    const to = shown.findIndex((i) => i.skuNo === sku);
    const run = shift && from >= 0 && to >= 0
      ? shown.slice(Math.min(from, to), Math.max(from, to) + 1).map((i) => i.skuNo)
      : [sku];
    setPicked((p) => {
      const n = new Set(p);
      run.forEach((k) => (on ? n.add(k) : n.delete(k)));
      return n;
    });
    lastClicked.current = sku;
  };
  const toggleShown = () => setPicked((p) => {
    const n = new Set(p);
    shown.forEach((i) => (allShownPicked ? n.delete(i.skuNo) : n.add(i.skuNo)));
    return n;
  });

  const print = (list) => {
    onPrint(list);
    onClose();
  };

  const chip = (key, label, count, active, onClick) => (
    <button key={key || 'all'} type="button" className={`tg-chip${active ? ' on' : ''}`} onClick={onClick}>
      {label} <span>{count}</span>
    </button>
  );

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal tg-modal" style={{ maxWidth: mode === 'ask' ? 480 : 660 }} role="dialog" aria-modal="true"
        aria-label={`Print tags ${invoiceNo}`} onClick={(e) => e.stopPropagation()}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="printer" size={22} /></span>
          <div>
            <h2>Print tags</h2>
            <p>{invoiceNo}</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        {mode === 'ask' ? (
          <div className="inv-body tg-ask">
            <button type="button" className="tg-choice" onClick={() => print(items)}>
              <Icon name="box" size={26} />
              <strong>All tags</strong>
              <span>{items.length} SKUs · {items.length} tags</span>
            </button>
            <button type="button" className="tg-choice" onClick={() => setMode('custom')}>
              <Icon name="list" size={26} />
              <strong>Custom</strong>
              <span>Choose which SKUs to print</span>
            </button>
          </div>
        ) : (
          <>
            <div className="inv-body tg-custom">
              <div className="tg-filter">
                <span className="tg-filter-label">Gender</span>
                <div className="tg-chips">
                  {chip('', 'All', items.length, !gender, () => setGender(''))}
                  {GENDERS.filter((g) => genderCounts[g.key]).map((g) => chip(g.key, g.label, genderCounts[g.key],
                    gender === g.key, () => setGender(g.key)))}
                </div>
              </div>
              {categories.length > 1 && (
                <div className="tg-filter">
                  <span className="tg-filter-label">Category</span>
                  <div className="tg-chips">
                    {chip('', 'All', items.length, !category, () => setCategory(''))}
                    {categories.map(([name, n]) => chip(name, name, n, category === name, () => setCategory(name)))}
                  </div>
                </div>
              )}
              <div className="tg-searchrow">
                <label className="tg-search">
                  <Icon name="search" size={15} />
                  <input type="search" placeholder="Search SKU or item…" value={search}
                    onChange={(e) => setSearch(e.target.value)} />
                </label>
                <button type="button" className="tg-ghost" onClick={toggleShown}>
                  {allShownPicked ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="tg-list">
                {shown.map((i) => {
                  const on = picked.has(i.skuNo);
                  return (
                    <div key={i.skuNo} role="checkbox" aria-checked={on} tabIndex={0} className={`tg-row${on ? ' on' : ''}`}
                      onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); /* no text selection on Shift+click */ }}
                      onClick={(e) => clickRow(i.skuNo, e.shiftKey)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          clickRow(i.skuNo, e.shiftKey);
                        }
                      }}>
                      <input type="checkbox" checked={on} readOnly tabIndex={-1} aria-hidden="true" />
                      <span className="tg-sku">{i.skuNo}</span>
                      <span className="tg-item">{i.category || ''}</span>
                      <span className="tg-wt">{formatWeight(i.netWeight)} g</span>
                    </div>
                  );
                })}
                {!shown.length && <div className="tg-none">No SKU matches.</div>}
              </div>
              <p className="tg-tip">
                Tip: click one SKU, then hold <b>Shift</b> and click another to tick every SKU between them.
                {chosen.length > 0 && <> · <b>{chosen.length} selected</b></>}
              </p>
            </div>
            <footer className="tg-footer">
              <button type="button" className="tg-ghost" onClick={() => setMode('ask')}>← Back</button>
              <button type="button" className="tg-print" disabled={!chosen.length} onClick={() => print(chosen)}>
                <Icon name="printer" size={15} />
                {chosen.length ? `Print ${chosen.length} tag${chosen.length === 1 ? '' : 's'}` : 'Select SKUs'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export default InvoiceTagModal;
