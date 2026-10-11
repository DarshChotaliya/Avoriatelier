import { useEffect, useId, useMemo, useState } from 'react';
import ComboBox from './ComboBox';
import Icon from './Icon';
import { MasterForm } from './MasterPage';
import SelectBox from './SelectBox';
import SizeField from './SizeField';
import { makeThumbnail } from '../utils/draftInvoices';
import { MASTER_PAGES } from '../constants/masterConfig';
import {
  LABOUR_TYPES, QUOTATION_STATUSES, calcQuoteLine, calcQuoteTotals, convertWeight,
} from '../utils/quotationCalc';
import { formatAmount, num } from '../utils/purchaseCalc';
import './PurchaseInvoice.css';
import './SalesInvoice.css';
import './Quotation.css';

const today = () => new Date().toISOString().slice(0, 10);

export const emptyQuoteLine = (isCustom = false) => ({
  isCustom, photo: '', designLink: '', category: '', size: '',
  skuNo: '', description: '', fromMetal: '', fromWeight: '', toMetal: '', weight: '', qty: '1', metalRate: '',
  labourType: 'perGram', labourRate: '', diamondCt: '', diamondRate: '', stoneAmount: '', otherCharges: '',
  cadCharge: '', gstPercent: '3',
});

const str = (v) => (v == null ? '' : String(v));

/** Field → true for every problem, so fields can be highlighted. */
export function validateQuotation(header, lines, stockBySku) {
  const blank = (v) => String(v ?? '').trim() === '';
  const headerErrors = {};
  ['quotationDate', 'branch', 'customerName'].forEach((f) => {
    if (blank(header[f])) headerErrors[f] = true;
  });
  if (!blank(header.contactNo) && !/^[0-9+\-\s]{7,15}$/.test(header.contactNo.trim())) headerErrors.contactNo = true;
  const lineErrors = lines.map((l) => {
    const e = {};
    // A design from stock needs its SKU; a custom design needs a category or a description.
    if (!l.isCustom && !stockBySku.has(l.skuNo)) e.skuNo = true;
    if (l.isCustom && blank(l.category) && blank(l.description)) e.category = true;
    if (blank(l.toMetal)) e.toMetal = true;
    if (num(l.weight) <= 0) e.weight = true;
    if (num(l.qty) < 1) e.qty = true;
    return e;
  });
  const count = Object.keys(headerErrors).length + lineErrors.reduce((n, e) => n + Object.keys(e).length, 0);
  return { header: headerErrors, lines: lineErrors, count };
}

export const toQuotationPayload = (header, lines) => ({
  ...header,
  customerName: header.customerName.trim(),
  advance: num(header.advance),
  lines: lines.map((l) => ({
    isCustom: Boolean(l.isCustom),
    photo: l.isCustom ? l.photo || null : null,
    designLink: l.isCustom ? l.designLink : null,
    category: l.isCustom ? l.category : null,
    size: l.isCustom ? l.size : null,
    skuNo: l.isCustom ? '' : l.skuNo,
    description: l.description,
    fromMetal: l.fromMetal,
    fromWeight: num(l.fromWeight),
    toMetal: l.toMetal,
    weight: num(l.weight),
    qty: Math.trunc(num(l.qty)) || 1,
    metalRate: num(l.metalRate),
    labourType: l.labourType,
    labourRate: num(l.labourRate),
    diamondCt: num(l.diamondCt),
    diamondRate: num(l.diamondRate),
    stoneAmount: num(l.stoneAmount),
    otherCharges: num(l.otherCharges),
    cadCharge: num(l.cadCharge),
    gstPercent: num(l.gstPercent),
  })),
});

function Field({ label, required, invalid, error = 'Required', className = '', children }) {
  return (
    <label className={`inv-cell ${className}${invalid ? ' inv-invalid' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {invalid && <small className="inv-error">{error}</small>}
    </label>
  );
}

/**
 * New / edit quotation. Each design is either from stock (pick the SKU; its weight is converted to the wanted metal
 * with the Metal Types weight factors) or custom (e.g. a Pinterest picture: reference photo, category, size and an
 * estimated weight). The rate comes from today's rate in Metal Types; everything can be changed.
 */
function QuotationModal({
  quotation, stock, branches, metalTypes, categories = [], startCustom = false, onSubmit, onClose,
  onAddCustomer,
}) {
  const [header, setHeader] = useState(() => ({
    quotationDate: quotation?.quotationDate ?? today(),
    branch: quotation?.branch ?? branches[0]?.name ?? '',
    customerName: quotation?.customerName ?? '',
    contactNo: quotation?.contactNo ?? '',
    status: quotation?.status ?? 'Open',
    notes: quotation?.notes ?? '',
    advance: quotation?.advance ? String(quotation.advance) : '',
  }));
  const [lines, setLines] = useState(() => (quotation
    // Saved lines come back with numbers; the form edits text. isCustom stays a true/false flag.
    ? quotation.lines.map((l) => ({
      ...Object.fromEntries(Object.entries({ ...emptyQuoteLine(), ...l })
        .map(([k, v]) => [k, typeof v === 'number' ? String(v) : v ?? ''])),
      isCustom: l.isCustom === true,
    }))
    : [emptyQuoteLine(startCustom)]));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const customerInputId = `${useId()}-customer`;

  useEffect(() => {
    // Escape closes the quotation only when no form (e.g. New Customer) is open on top of it.
    const onKey = (e) => e.key === 'Escape' && document.querySelectorAll('.inv-overlay').length === 1 && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const stockBySku = useMemo(() => new Map(stock.map((s) => [s.skuNo, s])), [stock]);
  const totals = useMemo(() => calcQuoteTotals(lines, header.advance), [lines, header.advance]);
  const validation = useMemo(() => validateQuotation(header, lines, stockBySku), [header, lines, stockBySku]);
  const errors = showErrors ? validation : { header: {}, lines: [] };
  const metalNames = metalTypes.map((m) => m.name);
  const skuOptions = useMemo(() => stock.map((s) => ({
    value: s.skuNo, label: s.skuNo,
    hint: `${s.category}${s.collection ? ` · ${s.collection}` : ''} · ${s.metalType} ${s.netWeight} g`,
  })), [stock]);

  const setField = (field) => (e) => setHeader((h) => ({ ...h, [field]: e.target.value }));
  const changeLine = (index, changes) => setLines((list) => list.map((l, i) => {
    if (i !== index) return l;
    const next = { ...l, ...changes };
    // Picking a SKU fills the design's metal and weight; the target metal fills its rate.
    if ('skuNo' in changes) {
      const s = stockBySku.get(changes.skuNo.trim());
      if (s && s.skuNo !== l.skuNo) {
        Object.assign(next, {
          skuNo: s.skuNo, description: [s.category, s.collection].filter(Boolean).join(' · '),
          fromMetal: s.metalType, fromWeight: str(s.netWeight),
        });
      }
    }
    if ('toMetal' in changes) {
      const m = metalTypes.find((x) => x.name === changes.toMetal);
      // Quotations use the metal's own quotation rate, never the purchase rate.
      if (m?.quoteRate) next.metalRate = str(m.quoteRate);
    }
    // A new design or target metal recalculates the weight (it can still be typed over afterwards).
    if (('skuNo' in changes || 'toMetal' in changes) && next.fromMetal && next.toMetal && num(next.fromWeight) > 0) {
      next.weight = str(convertWeight(next.fromWeight, next.fromMetal, next.toMetal, metalTypes));
    }
    return next;
  }));
  // "Custom Quotation" (list page) makes every design custom; "New Quotation" picks designs from stock.
  const custom = quotation ? quotation.lines.some((l) => l.isCustom) : startCustom;
  const addLine = () => setLines((list) => [...list, emptyQuoteLine(custom)]);
  const pickPhoto = async (index, file) => {
    const photo = await makeThumbnail(file);
    if (photo) changeLine(index, { photo });
  };
  const removeLine = (index) => setLines((list) => list.filter((_, i) => i !== index));

  // Save the new customer in the Customers master and pick them on this quotation.
  const addCustomer = async (record) => {
    await onAddCustomer(record);
    setHeader((h) => ({ ...h, customerName: record.name.trim(), contactNo: record.contactNo ?? '' }));
    setAddingCustomer(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validation.count > 0) {
      setShowErrors(true);
      setError(`Please fix the ${validation.count} highlighted field${validation.count === 1 ? '' : 's'}.`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit(toQuotationPayload(header, lines));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const title = quotation ? `Edit Quotation ${quotation.quotationNo}`
    : startCustom ? 'New Custom Quotation' : 'New Quotation';

  return (
    <div className="inv-overlay">
      <form className="inv-modal so-modal qt-modal" onSubmit={handleSubmit} noValidate role="dialog" aria-modal="true"
        aria-label={title}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="list" size={22} /></span>
          <div>
            <h2>{title}</h2>
            <p>A design from stock in another metal, or a custom design from the customer&apos;s picture · stock not used</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          {error && <div className="alert">{error}</div>}

          <section className="inv-card so-card">
            <div className="so-grid qt-grid-head">
              <Field label="Date" required invalid={errors.header.quotationDate}>
                <input type="date" value={header.quotationDate} onChange={setField('quotationDate')} />
              </Field>
              <Field label="Branch" required invalid={errors.header.branch}>
                <SelectBox value={header.branch} aria-label="Branch" options={branches.map((b) => b.name)}
                  onChange={(v) => setHeader((h) => ({ ...h, branch: v }))} />
              </Field>
              {/* Not a <label> wrapper: the "New customer" button sits beside the label, outside it. */}
              <div className={`inv-cell cust-field${errors.header.customerName ? ' inv-invalid' : ''}`}>
                <span>
                  <label htmlFor={customerInputId}>Customer Name<em> *</em></label>
                  {onAddCustomer && (
                    <button type="button" className="cust-add" onClick={() => setAddingCustomer(true)}>
                      <Icon name="plus" size={13} />
                      New customer
                    </button>
                  )}
                </span>
                {/* Typed freely: a quotation's customer does not come from the Customers master. */}
                <input id={customerInputId} placeholder="Customer name" value={header.customerName}
                  onChange={setField('customerName')} maxLength={200} />
                {errors.header.customerName && <small className="inv-error">Required</small>}
              </div>
              <Field label="Contact No" invalid={errors.header.contactNo} error="7–15 digits">
                <input type="tel" placeholder="Mobile no." value={header.contactNo} onChange={setField('contactNo')}
                  maxLength={15} />
              </Field>
              <Field label="Status">
                <SelectBox value={header.status} aria-label="Status" options={QUOTATION_STATUSES}
                  onChange={(v) => setHeader((h) => ({ ...h, status: v }))} />
              </Field>
              <Field label="Advance (₹)">
                <input type="number" min="0" step="any" className="inv-num" placeholder="0" value={header.advance}
                  onChange={setField('advance')} />
              </Field>
              <Field label="Notes" className="so-notes">
                <input placeholder="Optional notes (size, finish, delivery time…)" value={header.notes}
                  onChange={setField('notes')} maxLength={500} />
              </Field>
            </div>
          </section>

          <div className="inv-items-bar">
            <h3>Designs <span className="inv-count">{lines.length}</span></h3>
            <button type="button" className="inv-btn-gold" onClick={addLine}>
              <Icon name="plusCircle" size={16} />
              Add Design
            </button>
          </div>


          {metalTypes.some((m) => !m.quoteRate) && (
            <p className="qt-tip">
              <Icon name="info" size={15} />
              Set the “Quotation rate / g” for each metal in Masters → Metal Types and it fills in here.
            </p>
          )}


          <div className="qt-lines">
            {lines.map((l, i) => {
              const c = calcQuoteLine(l);
              const s = stockBySku.get(l.skuNo);
              const e = errors.lines[i] ?? {};
              const set = (field) => (ev) => changeLine(i, { [field]: ev.target.value });
              const numInput = (field, step = 'any') => (
                <input type="number" min="0" step={step} className="inv-num" value={l[field]} onChange={set(field)} />
              );
              return (
                // Rows have no id until saved, so the index is the key.
                <section key={i} className="inv-card qt-line" aria-label={`Design ${i + 1}`}>
                  <div className="qt-line-head">
                    <span className="qt-line-no">{i + 1}</span>
                    {l.isCustom ? (
                      <label className="qt-photo" title="Reference picture (e.g. from Pinterest)">
                        {l.photo ? <img src={l.photo} alt="" /> : <><Icon name="camera" size={18} /><small>Photo</small></>}
                        <input type="file" accept="image/*" hidden aria-label="Reference photo"
                          onChange={(ev) => ev.target.files[0] && pickPhoto(i, ev.target.files[0])} />
                      </label>
                    ) : s?.thumb ? <img src={s.thumb} alt="" className="qt-thumb" /> : <span className="qt-thumb qt-thumb-empty" />}
                    <div className="qt-line-title">
                      {l.isCustom ? (
                        [l.category, l.size].some(Boolean) && <b>{[l.category, l.size].filter(Boolean).join(' · ')}</b>
                      ) : (
                        <span className="muted">
                          <b>{s ? l.description || s.category : 'Pick a design'}</b>
                          {' · '}
                          {l.fromMetal ? `In stock as ${l.fromMetal} · ${l.fromWeight} g` : 'Type or pick a SKU from stock'}
                        </span>
                      )}
                    </div>
                    <div className="qt-line-total">
                      <span className="muted">
                        Metal ₹{formatAmount(c.metal)} · Labour ₹{formatAmount(c.labour)}
                        {c.diamond > 0 && ` · Diamond ₹${formatAmount(c.diamond)}`} · GST ₹{formatAmount(c.gst)}
                      </span>
                      <b>₹{formatAmount(c.total)}</b>
                    </div>
                    {lines.length > 1 && (
                      <button type="button" className="inv-icon-btn danger" aria-label="Remove design"
                        onClick={() => removeLine(i)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>

                  {l.isCustom && (
                    <div className="qt-line-grid qt-row qt-custom-grid">
                      <Field label="Category" required invalid={e.category} error="Category or description">
                        <SelectBox value={l.category} aria-label="Category" options={categories.map((cat) => cat.name)}
                          allowEmpty placeholder="— Category —"
                          onChange={(v) => changeLine(i, { category: v, size: '' })} />
                      </Field>
                      <SizeField category={l.category} value={l.size} onChange={(size) => changeLine(i, { size })}
                        Cell={Field} />
                      <Field label="Design link (Pinterest…)">
                        <input type="url" placeholder="https://" value={l.designLink} onChange={set('designLink')}
                          maxLength={500} />
                      </Field>
                      <Field label="Description">
                        <input placeholder="e.g. Floral halo ring" value={l.description} onChange={set('description')}
                          maxLength={200} />
                      </Field>
                    </div>
                  )}
                  {/* Metal on one line. */}
                  <div className="qt-line-grid qt-row">
                    {!l.isCustom && (
                      <Field label="SKU / Design" required invalid={e.skuNo} error={l.skuNo ? 'Unknown SKU' : 'Required'}>
                        <ComboBox placeholder="Type SKU…" value={l.skuNo} onChange={(v) => changeLine(i, { skuNo: v })}
                          options={skuOptions} aria-label="SKU" />
                      </Field>
                    )}
                    <Field label="Quote in" required invalid={e.toMetal}>
                      <SelectBox value={l.toMetal} aria-label="Quote in metal" options={metalNames}
                        placeholder="Metal…" onChange={(v) => changeLine(i, { toMetal: v })} />
                    </Field>
                    <Field label={l.isCustom ? 'Est. net weight (g)' : 'Net weight (g)'} required invalid={e.weight}>
                      {numInput('weight')}
                    </Field>
                    <Field label="Rate (₹/g)">{numInput('metalRate')}</Field>
                    <Field label="Labour" className="qt-labour">
                      <div>
                        {numInput('labourRate')}
                        <SelectBox value={l.labourType} aria-label="Labour type" options={LABOUR_TYPES}
                          onChange={(v) => changeLine(i, { labourType: v })} />
                      </div>
                    </Field>
                  </div>
                  {/* Diamonds, stones and charges on their own line. */}
                  <div className="qt-line-grid qt-row">
                    <Field label="Diamond (ct)">{numInput('diamondCt')}</Field>
                    <Field label="Diamond rate / ct">{numInput('diamondRate')}</Field>
                    <Field label="Stones (₹)">{numInput('stoneAmount')}</Field>
                    <Field label="Other (₹)">{numInput('otherCharges')}</Field>
                    {l.isCustom && <Field label="CAD / Design (₹, once)">{numInput('cadCharge')}</Field>}
                    <Field label="GST %">{numInput('gstPercent')}</Field>
                    <Field label="Qty" invalid={e.qty} error="Min 1">{numInput('qty', '1')}</Field>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="inv-summary-bar">
            <span className="inv-count-pill">{lines.length} design{lines.length === 1 ? '' : 's'}</span>
            <div className="inv-summary-right">
              <span>Taxable: <b className="inv-mono">₹{formatAmount(totals.taxable)}</b></span>
              <span>GST: <b className="inv-mono inv-mint">₹{formatAmount(totals.gst)}</b></span>
              {totals.advance > 0 && (
                <>
                  <span>Advance: <b className="inv-mono">₹{formatAmount(totals.advance)}</b></span>
                  <span>Balance: <b className="inv-mono">₹{formatAmount(totals.balance)}</b></span>
                </>
              )}
              <span className="inv-total-pill">₹{formatAmount(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <footer className="inv-footer">
          <span>Quotation Total: <b className="inv-mono inv-big">₹{formatAmount(totals.grandTotal)}</b></span>
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
              <Icon name="save" size={16} />
              {saving ? 'Saving…' : quotation ? 'Save Changes' : 'Create Quotation'}
            </button>
          </div>
        </footer>
      </form>
      {addingCustomer && (
        <MasterForm config={MASTER_PAGES.customers} initial={{ name: header.customerName.trim() }}
          onSave={addCustomer} onClose={() => setAddingCustomer(false)} />
      )}
    </div>
  );
}

export default QuotationModal;
