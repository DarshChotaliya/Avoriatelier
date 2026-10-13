import { useEffect, useMemo, useState } from 'react';
import ComboBox from './ComboBox';
import Icon from './Icon';
import InvoiceItemCard from './InvoiceItemCard';
import SelectBox from './SelectBox';
import { calcInvoiceItem, calcInvoiceTotals } from '../utils/invoiceCalc';
import { formatAmount, formatWeight, num } from '../utils/purchaseCalc';
import { emptyInvoiceItem } from '../constants/purchaseOptions';
import { findByName } from '../utils/masters';
import { DEFAULT_SKU_SETTINGS, nextSku } from '../utils/skuFormat';
import './PurchaseInvoice.css';

// Same state: CGST + SGST; another state: IGST (applies to every item on the invoice).
const GST_TYPES = [
  { value: 'local', label: 'Same state (CGST + SGST)' },
  { value: 'igst', label: 'Other state (IGST)' },
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyHeader = (branches) => ({
  purchaseDate: today(),
  branch: branches[0]?.name ?? '',
  supplierName: '',
  supplierInvoiceNo: '',
  supplierInvoiceDate: '',
  remarks: '',
  // Inter-state purchase: IGST for the whole invoice instead of CGST + SGST.
  igst: false,
});

/** IGST applies when the supplier's state differs from the company's (both must be known). */
export const isInterState = (supplierState, companyState) => Boolean(supplierState && companyState
  && supplierState.trim().toLowerCase() !== companyState.trim().toLowerCase());

const text = (v) => String(v ?? '').trim() || null;

// Stored values → form values: numbers become strings so inputs stay controlled.
const str = (v) => (v == null ? '' : String(v));
const rowsToForm = (rows) => (rows ?? []).map((r) => Object.fromEntries(
  Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v ?? '']),
));

/** A saved invoice → the dialog's header and items (existing items keep id, SKU and photo thumb). */
export function invoiceToForm(invoice, settings) {
  const header = {
    purchaseDate: invoice.purchaseDate,
    branch: invoice.branch ?? '',
    supplierName: invoice.supplierName ?? '',
    supplierInvoiceNo: invoice.supplierInvoiceNo ?? '',
    supplierInvoiceDate: invoice.supplierInvoiceDate ?? '',
    remarks: invoice.remarks ?? '',
    // Older invoices stored IGST per item; any IGST item makes the whole invoice inter-state.
    igst: invoice.igst ?? invoice.items.some((i) => i.igst),
  };
  const items = invoice.items.map((i) => {
    const base = emptyInvoiceItem(settings);
    const form = { ...base };
    Object.keys(base).forEach((k) => {
      if (k === 'photo' || k === 'diamonds' || k === 'stones' || k === 'igst') return;
      // Ticks stay true / false: as text, "false" would count as ticked.
      if (i[k] !== undefined) form[k] = typeof base[k] === 'boolean' ? Boolean(i[k]) : str(i[k]);
    });
    return {
      ...form,
      id: i.id,
      skuNo: i.skuNo,
      thumb: i.thumb ?? null,
      metalType: i.metalType ?? i.sampleMetal ?? '',
      igst: header.igst,
      diamonds: rowsToForm(i.diamonds),
      stones: rowsToForm(i.stones),
    };
  });
  return { header, items };
}

/** Request body for the future purchase-invoice API (photos are uploaded separately). */
export const toInvoicePayload = (header, items, diamondTypes = []) => ({
  ...header,
  supplierInvoiceDate: header.supplierInvoiceDate || null,
  items: items.map((i) => {
    const c = calcInvoiceItem(i);
    return {
      // Present only for items that were already saved (editing); new items get an id and SKU on save.
      id: i.id,
      category: i.category,
      designCode: text(i.designCode),
      collection: text(i.collection),
      size: text(i.size),
      diamondType: i.diamondType,
      skuPrefix: findByName(diamondTypes, i.diamondType)?.skuPrefix ?? null,
      metalType: i.metalType,
      qty: Math.trunc(num(i.qty)),
      grossWeight: num(i.grossWeight),
      netWeight: num(i.netWeight),
      metalRate: num(i.metalRate),
      diamonds: i.diamonds.map((d) => ({
        code: text(d.code), diamondType: text(d.diamondType), size: text(d.size), pcs: num(d.pcs),
        weight: num(d.weight), rate: num(d.rate),
      })),
      stones: i.stones.map((s) => ({
        stoneName: text(s.stoneName), color: text(s.color), stoneType: s.stoneType, pricing: s.pricing,
        size: text(s.size), pcs: num(s.pcs), weight: num(s.weight), rate: num(s.rate),
      })),
      labourRate: num(i.labourRate),
      labourFixed: Boolean(i.labourFixed),
      labourMinimum: num(i.labourMinimum),
      hallmark: num(i.hallmark),
      otherCharges: num(i.otherCharges),
      // Cost per piece, so lists and stock can use one "price" field.
      price: c.costPerPiece,
      mrp: num(i.mrp),
      discount: num(i.discount),
      gstPercent: num(i.gstPercent),
      igst: i.igst,
      description: text(i.description),
      // Existing photo (data URL) of a saved item; a newly chosen photo replaces it on save.
      thumb: i.thumb ?? null,
    };
  }),
});

// Keys for unsaved items, so each card keeps its own state (photo preview, collapsed) when a new one is put on top.
let rowKeys = 0;
const newRowKey = () => { rowKeys += 1; return `new-${rowKeys}`; };

const REQUIRED_ITEM_FIELDS = ['category', 'diamondType', 'metalType'];

/** Field → true for every problem; used to highlight fields instead of browser popups. */
export function validateInvoice(header, items) {
  const blank = (v) => String(v ?? '').trim() === '';
  const headerErrors = {};
  ['purchaseDate', 'branch', 'supplierName'].forEach((f) => {
    if (blank(header[f])) headerErrors[f] = true;
  });
  const itemErrors = items.map((item) => {
    const e = {};
    REQUIRED_ITEM_FIELDS.forEach((f) => {
      if (blank(item[f])) e[f] = true;
    });
    if (num(item.qty) < 1) e.qty = true;
    if (num(item.netWeight) <= 0) e.netWeight = true;
    else if (item.grossWeight !== '' && num(item.netWeight) > num(item.grossWeight)) e.netWeight = true;
    if (num(item.discount) > num(item.mrp)) e.discount = true;
    (item.stones ?? []).forEach((s, i) => {
      if (blank(s.stoneType) || (num(s.weight) <= 0 && num(s.pcs) <= 0)) e[`stone${i}`] = true;
    });
    (item.diamonds ?? []).forEach((d, i) => {
      if (num(d.weight) <= 0) e[`diamond${i}`] = true;
    });
    return e;
  });
  const count = Object.keys(headerErrors).length + itemErrors.reduce((n, e) => n + Object.keys(e).length, 0);
  return { header: headerErrors, items: itemErrors, count };
}

/** Labelled header input with an inline error under it. */
function HeaderField({ label, required, invalid, className = '', children }) {
  return (
    <label className={`inv-cell ${className}${invalid ? ' inv-invalid' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {invalid && <small className="inv-error">Required</small>}
    </label>
  );
}

/**
 * Full-screen "New Purchase Invoice" dialog laid out like the supplier packing list.
 * `onSubmit` receives the payload and the raw items (for photos).
 */
/**
 * `invoice` opens a saved invoice for editing. With `itemOnly`, `invoice.items` holds the one item being
 * edited: the header is shown read-only and items cannot be added or removed.
 */
function PurchaseInvoiceModal({
  masters, settings, invoice, itemOnly = false, takenSkus = [], skuSettings = DEFAULT_SKU_SETTINGS, onSubmit, onSaveDraft,
  onClose,
}) {
  const [initial] = useState(() => (invoice ? invoiceToForm(invoice, settings) : null));
  const [header, setHeader] = useState(() => initial?.header ?? emptyHeader(masters.branches));
  const [items, setItems] = useState(() => initial?.items ?? [{ ...emptyInvoiceItem(settings), rowKey: newRowKey() }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Add Item saves what is typed so far, so the invoice exists in the database from the first item on.
  const [savedId, setSavedId] = useState(invoice?.id ?? null);
  const [savedNote, setSavedNote] = useState('');
  // Errors are only shown after the first Create click, then update live as fields are filled.
  const [showErrors, setShowErrors] = useState(false);

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

  const totals = useMemo(() => calcInvoiceTotals(items), [items]);
  // The SKU each new item will get on save (company + item + size + gender + running number), counting the new
  // items above it. It appears once the category is picked; the server gives out the real number.
  const skuPreviews = useMemo(() => {
    const taken = [...takenSkus];
    let counter = skuSettings.counter;
    return items.map((it) => {
      if (it.skuNo) return it.skuNo;
      if (!it.category) return '';
      const shortCode = findByName(masters.categories, it.category)?.shortCode;
      const { sku, sequence } = nextSku(skuSettings, { ...it, shortCode }, taken, counter);
      counter = sequence;
      taken.push(sku);
      return sku;
    });
  }, [items, takenSkus, skuSettings, masters.categories]);
  const validation = useMemo(() => validateInvoice(header, items), [header, items]);
  const errors = showErrors ? validation : { header: {}, items: [] };

  // IGST is one setting for the whole invoice; every item follows it.
  const setIgst = (igst) => {
    setHeader((h) => ({ ...h, igst }));
    setItems((list) => list.map((it) => ({ ...it, igst })));
  };
  const setField = (field) => (e) => setHeader((h) => ({ ...h, [field]: e.target.value }));
  // Picking a known supplier sets IGST from their state (still changeable by hand).
  const setSupplier = (e) => {
    const name = e.target.value;
    setHeader((h) => ({ ...h, supplierName: name }));
    const supplier = masters.suppliers.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (supplier?.state && settings.state) setIgst(isInterState(supplier.state, settings.state));
  };
  const changeItem = (index, changes) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...changes } : it)));
  const showProblems = (message) => {
    setShowErrors(true);
    setError(message);
    // Focus the first highlighted field once it has rendered.
    requestAnimationFrame(() => {
      document.querySelector('.inv-modal .inv-invalid input, .inv-modal .inv-invalid select')?.focus();
    });
  };

  /**
   * Add Item first saves the items typed so far (so a power cut or a closed browser loses at most the item being
   * typed), then opens a new one at the top, where the user is looking.
   */
  const addItem = async () => {
    if (validation.count > 0) {
      showProblems('Complete the highlighted fields first: an item is saved before the next one is added.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const saved = await onSaveDraft(toInvoicePayload(header, items, masters.diamondTypes), items, savedId);
      setSavedId(saved.id);
      // The saved items come back with their id and SKU, so the next save updates them instead of adding copies.
      const stored = invoiceToForm(saved, settings).items;
      setItems([{ ...emptyInvoiceItem(settings), igst: header.igst, rowKey: newRowKey() }, ...stored]);
      setShowErrors(false);
      setSavedNote(`${stored.length} item${stored.length === 1 ? '' : 's'} saved`);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };
  const removeItem = (index) => setItems((list) => list.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validation.count > 0) {
      showProblems(`Please fix the ${validation.count} highlighted field${validation.count === 1 ? '' : 's'}.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit(toInvoicePayload(header, items, masters.diamondTypes), items, savedId);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  let title = 'New Purchase Invoice';
  if (itemOnly) title = `Edit Item ${items[0]?.skuNo ?? ''}`;
  else if (invoice) title = 'Edit Purchase Invoice';

  const single = itemOnly ? items[0] : null;
  const singleCost = single ? calcInvoiceItem(single) : null;
  const subtitle = single
    ? [single.category, single.collection, header.supplierName].filter(Boolean).join(' · ')
    : 'Metal · Diamond · Stone · Labour per item, like the supplier packing list';
  const longDate = (iso) => (iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null);

  return (
    <div className="inv-overlay">
      <form className={`inv-modal inv-modal-purchase${itemOnly ? ' inv-modal-item' : ''}`} onSubmit={handleSubmit} noValidate
        role="dialog" aria-modal="true" aria-label={title}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="receipt" size={22} /></span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          {error && <div className="alert">{error}</div>}

          {itemOnly && (
            // Invoice details for context only; they are changed from the full invoice edit.
            <div className="ie-chips" aria-label="Invoice details">
              <span className="ie-chip"><Icon name="calendar" size={14} /> {longDate(header.purchaseDate)}</span>
              <span className="ie-chip"><Icon name="truck" size={14} /> {header.supplierName}</span>
              {header.supplierInvoiceNo && (
                <span className="ie-chip"><Icon name="receipt" size={14} /> Bill {header.supplierInvoiceNo}</span>
              )}
              {header.branch && <span className="ie-chip"><Icon name="building" size={14} /> {header.branch}</span>}
              <span className="ie-chip ie-chip-tax">{header.igst ? 'IGST' : 'CGST + SGST'}</span>
            </div>
          )}

          {!itemOnly && (
          <section className="inv-card">
            <h3 className="inv-section-title">Invoice Header</h3>
            <fieldset className="inv-header-grid inv-fieldset">
              <HeaderField label="Purchase Date" required invalid={errors.header.purchaseDate}>
                <input type="date" value={header.purchaseDate} onChange={setField('purchaseDate')} />
              </HeaderField>
              <HeaderField label="Branch" required invalid={errors.header.branch}>
                <SelectBox value={header.branch} onChange={(v) => setHeader((h) => ({ ...h, branch: v }))}
                  options={masters.branches.map((b) => b.name)}
                  placeholder={masters.branches.length ? '— Branch —' : '— Add in Branches —'} aria-label="Branch" />
              </HeaderField>
              <HeaderField label="Supplier / Manufacturer" required invalid={errors.header.supplierName}>
                <ComboBox placeholder="Type or pick supplier" value={header.supplierName}
                  onChange={(v) => setSupplier({ target: { value: v } })} maxLength={200} aria-label="Supplier"
                  options={masters.suppliers.map((s) => ({ value: s.name, label: s.name, hint: s.gstNo }))} />
              </HeaderField>
              <HeaderField label="Supplier Invoice No.">
                <input placeholder="JS/26-27/178" value={header.supplierInvoiceNo}
                  onChange={setField('supplierInvoiceNo')} maxLength={50} />
              </HeaderField>
              <HeaderField label="Supplier Invoice Date">
                <input type="date" value={header.supplierInvoiceDate} onChange={setField('supplierInvoiceDate')} />
              </HeaderField>
              <HeaderField label="Remarks">
                <input placeholder="Optional notes" value={header.remarks} onChange={setField('remarks')}
                  maxLength={500} />
              </HeaderField>
              <HeaderField label="GST Type">
                <SelectBox value={header.igst ? 'igst' : 'local'} aria-label="GST Type" options={GST_TYPES}
                  onChange={(v) => setIgst(v === 'igst')} />
              </HeaderField>
            </fieldset>
          </section>
          )}

          {!itemOnly && (
            <div className="inv-items-bar">
              <h3>
                Items <span className="inv-count">{items.length}</span>
                {savedNote && <span className="inv-saved"><Icon name="check" size={13} /> {savedNote}</span>}
              </h3>
              <button type="button" className="inv-btn-gold" onClick={addItem} disabled={saving}
                title="Saves the items typed so far, then opens a new one">
                <Icon name="plusCircle" size={16} />
                Add Item
              </button>
            </div>
          )}

          {items.map((item, i) => (
            <InvoiceItemCard
              // Saved items have an id, new ones a row key (see newRowKey).
              key={item.id ?? item.rowKey ?? i}
              index={i}
              item={item}
              masters={masters}
              canRemove={!itemOnly && items.length > 1}
              embedded={itemOnly}
              skuPreview={skuPreviews[i]}
              errors={errors.items[i] ?? {}}
              onChange={(changes) => changeItem(i, changes)}
              onRemove={() => removeItem(i)}
            />
          ))}

          {!itemOnly && (
          <div className="inv-summary-bar">
            <span className="inv-count-pill">{items.length} item{items.length === 1 ? '' : 's'}</span>
            <span>Net Wt: <b className="inv-mono">{formatWeight(totals.netWeight)} g</b></span>
            <span>Stone: <b className="inv-mono">{formatWeight(totals.stoneCt)} ct</b></span>
            <div className="inv-summary-right">
              <span>Taxable: <b className="inv-mono">₹{formatAmount(totals.taxable)}</b></span>
              {header.igst ? (
                <span>IGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.igst)}</b></span>
              ) : (
                <>
                  <span>CGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.cgst)}</b></span>
                  <span>SGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.sgst)}</b></span>
                </>
              )}
              <span>Round Off: <b className="inv-mono">₹{formatAmount(totals.roundOff)}</b></span>
              <span className="inv-total-pill">₹{formatAmount(totals.grandTotal)}</span>
            </div>
          </div>
          )}
        </div>

        <footer className="inv-footer">
          {single ? (
            <div className="ie-total">
              <span>Cost / pc <b className="inv-mono">₹{formatAmount(singleCost.costPerPiece)}</b></span>
              {num(single.qty) > 1 && <span>× {single.qty}</span>}
              <span>GST <b className="inv-mono">₹{formatAmount(singleCost.gstAmount)}</b></span>
              <span>Gross <b className="inv-mono inv-big">₹{formatAmount(singleCost.grossAmount)}</b></span>
            </div>
          ) : (
            <span>
              Grand Total: <b className="inv-mono inv-big">₹{formatAmount(totals.grandTotal)}</b>
              {' · '}Net Wt: <b>{formatWeight(totals.netWeight)} g</b>
            </span>
          )}
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
              <Icon name="save" size={16} />
              {saving ? 'Saving…' : invoice ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

export default PurchaseInvoiceModal;
