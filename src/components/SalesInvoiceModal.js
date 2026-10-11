import { useEffect, useId, useMemo, useState } from 'react';
import ComboBox from './ComboBox';
import Icon from './Icon';
import { MasterForm } from './MasterPage';
import SelectBox from './SelectBox';
import { MASTER_PAGES } from '../constants/masterConfig';
import { calcSaleTotals, saleLineAmount } from '../utils/salesCalc';
import { formatAmount, money, num } from '../utils/purchaseCalc';
import {
  ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, SALES_CHANNELS, emptySaleLine,
} from '../constants/salesOptions';
import './PurchaseInvoice.css';
import './SalesInvoice.css';
import './Quotation.css';

const today = () => new Date().toISOString().slice(0, 10);

const emptyHeader = (branches) => ({
  invoiceDate: today(),
  branch: branches[0]?.name ?? '',
  customerName: '',
  contactNo: '',
  city: '',
  state: '',
  salesChannel: SALES_CHANNELS[0],
  paymentMethod: 'ONLINE/UPI',
  paymentStatus: 'PENDING',
  orderStatus: 'PROCESSING',
  courierPartner: '',
  trackingNo: '',
  shipping: '',
  expenses: '',
  roundOff: '',
  notes: '',
  billingAddress: '',
  shippingAddress: '',
  shippingSameAsBilling: true,
});

/** Field → true for every problem, so fields can be highlighted instead of using browser popups. */
export function validateSale(header, lines, stockBySku) {
  const blank = (v) => String(v ?? '').trim() === '';
  const headerErrors = {};
  ['invoiceDate', 'branch', 'customerName'].forEach((f) => {
    if (blank(header[f])) headerErrors[f] = true;
  });
  if (!blank(header.contactNo) && !/^[0-9+\-\s]{7,15}$/.test(header.contactNo.trim())) headerErrors.contactNo = true;

  // The same SKU on two lines counts against one stock figure.
  const wanted = new Map();
  lines.forEach((l) => wanted.set(l.skuNo, (wanted.get(l.skuNo) ?? 0) + num(l.qty)));

  const lineErrors = lines.map((l) => {
    const e = {};
    const stock = stockBySku.get(l.skuNo);
    if (!stock) e.skuNo = true;
    if (num(l.qty) < 1 || (stock && wanted.get(l.skuNo) > stock.available)) e.qty = true;
    if (num(l.netWeight) <= 0) e.netWeight = true;
    if (num(l.selling) <= 0) e.selling = true;
    return e;
  });
  const count = Object.keys(headerErrors).length + lineErrors.reduce((n, e) => n + Object.keys(e).length, 0);
  return { header: headerErrors, lines: lineErrors, count };
}

export const toSalePayload = (header, lines) => ({
  ...header,
  customerName: header.customerName.trim(),
  shipping: num(header.shipping),
  expenses: num(header.expenses),
  roundOff: num(header.roundOff),
  shippingAddress: header.shippingSameAsBilling ? header.billingAddress : header.shippingAddress,
  lines: lines.map((l) => ({
    skuNo: l.skuNo,
    description: l.description,
    hsnSac: l.hsnSac,
    metalType: l.metalType,
    qty: Math.trunc(num(l.qty)),
    grossWeight: num(l.grossWeight),
    netWeight: num(l.netWeight),
    metalAmount: num(l.metalAmount),
    diaPcs: num(l.diaPcs),
    diaWeight: num(l.diaWeight),
    diaAmount: num(l.diaAmount),
    stonePcs: num(l.stonePcs),
    stoneWeight: num(l.stoneWeight),
    stoneAmount: num(l.stoneAmount),
    makingCharges: num(l.makingCharges),
    mrp: num(l.mrp),
    discount: num(l.discount),
    selling: num(l.selling),
    gstPercent: num(l.gstPercent),
    igst: l.igst,
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

const Select = ({ value, onChange, options }) => (
  // setField handlers read e.target.value, so pass the chosen value in that shape.
  <SelectBox value={value} onChange={(v) => onChange({ target: { value: v } })} options={options} />
);

/** New sale, or (with `invoice`) editing a saved one. */
function SalesInvoiceModal({ invoice, invoiceNo, stock, customers, branches, onSubmit, onClose, onAddCustomer }) {
  // Saved values come back as numbers / nulls; the form edits text.
  const asText = (o) => Object.fromEntries(Object.entries(o)
    .map(([k, v]) => [k, typeof v === 'number' ? String(v) : v ?? '']));
  const [header, setHeader] = useState(() => {
    const empty = emptyHeader(branches);
    if (!invoice) return empty;
    const saved = asText(invoice);
    return {
      ...Object.fromEntries(Object.keys(empty).map((k) => [k, saved[k] ?? empty[k]])),
      shippingSameAsBilling: Boolean(invoice.shippingSameAsBilling),
    };
  });
  const [lines, setLines] = useState(() => (invoice
    ? invoice.lines.map((l) => ({ ...emptySaleLine(), ...asText(l), igst: Boolean(l.igst) }))
    : [emptySaleLine()]));
  // Closed until its title is clicked; a saved sale that has an address opens with it showing.
  const [addressOpen, setAddressOpen] = useState(() => Boolean(invoice?.billingAddress || invoice?.shippingAddress));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const customerInputId = `${useId()}-customer`;

  useEffect(() => {
    // Escape closes the sale only when no form (e.g. New Customer) is open on top of it.
    const onKey = (e) => e.key === 'Escape' && document.querySelectorAll('.inv-overlay').length === 1 && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // When editing, the pieces already on this sale count as available again.
  const stockNow = useMemo(() => {
    if (!invoice) return stock;
    const own = new Map();
    invoice.lines.forEach((l) => own.set(l.skuNo, (own.get(l.skuNo) ?? 0) + num(l.qty)));
    return stock.map((s) => (own.has(s.skuNo) ? { ...s, available: s.available + own.get(s.skuNo) } : s));
  }, [stock, invoice]);
  const stockBySku = useMemo(() => new Map(stockNow.map((s) => [s.skuNo, s])), [stockNow]);
  const totals = useMemo(() => calcSaleTotals(lines, header.shipping, header.roundOff),
    [lines, header.shipping, header.roundOff]);
  const validation = useMemo(() => validateSale(header, lines, stockBySku), [header, lines, stockBySku]);
  const errors = showErrors ? validation : { header: {}, lines: [] };
  const sellable = stockNow.filter((s) => s.available > 0);
  const skuOptions = sellable.map((s) => ({
    value: s.skuNo, label: s.skuNo,
    hint: `${s.category}${s.collection ? ` · ${s.collection}` : ''} · Stock ${s.available}`,
  }));

  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setHeader((h) => ({ ...h, [field]: value }));
  };

  // A known customer (Customers master or an earlier invoice) fills contact, city, state and address.
  const setCustomer = (e) => {
    const name = e.target.value;
    const known = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setHeader((h) => ({
      ...h,
      customerName: name,
      ...(known && {
        contactNo: known.contactNo ?? '', city: known.city ?? '', state: known.state ?? '',
        billingAddress: known.address ?? '',
      }),
    }));
  };

  // Save the new customer in the Customers master and fill their details on this sale.
  const addCustomer = async (record) => {
    await onAddCustomer(record);
    setHeader((h) => ({
      ...h, customerName: record.name.trim(), contactNo: record.contactNo ?? '', city: record.city ?? '',
      state: record.state ?? '', billingAddress: record.address ?? '',
    }));
    setAddingCustomer(false);
  };

  const changeLine = (index, changes) => setLines((list) => list.map((l, i) => {
    if (i !== index) return l;
    const next = { ...l, ...changes };
    // Picking a SKU fills what the piece is (description, metal, weights, diamond / stone pieces) and its prices.
    if ('skuNo' in changes) {
      const s = stockBySku.get(changes.skuNo.trim());
      if (s && s.skuNo !== l.skuNo) {
        const show = (v) => (num(v) ? String(v) : '');
        Object.assign(next, {
          skuNo: s.skuNo, netWeight: String(s.netWeight), mrp: String(s.mrp), discount: String(s.discount),
          selling: String(s.salePrice), gstPercent: String(s.gstPercent || 3),
          description: `AVORI ${[s.collection, s.category].filter(Boolean).join(' ')}`.toUpperCase(),
          metalType: (s.metal ? `${s.metal} (${s.metalType})` : s.metalType ?? '').toUpperCase(),
          grossWeight: show(s.grossWeight), diaPcs: show(s.diaPcs), diaWeight: show(s.diaWeight),
          stonePcs: show(s.stonePcs), stoneWeight: show(s.stoneWeight),
        });
      }
    }
    if ('mrp' in changes || 'discount' in changes) {
      next.selling = String(money(num(next.mrp) - num(next.discount)));
    }
    // Amount = Metal + Diamond + Stone + Making; with it, the selling price per piece is Amount ÷ Qty.
    const amountFields = ['metalAmount', 'diaAmount', 'stoneAmount', 'makingCharges', 'qty'];
    const amount = num(next.metalAmount) + num(next.diaAmount) + num(next.stoneAmount) + num(next.makingCharges);
    if (amountFields.some((f) => f in changes) && amount > 0 && num(next.qty) > 0) {
      next.selling = String(money(amount / num(next.qty)));
    }
    return next;
  }));
  const addLine = () => setLines((list) => [...list, emptySaleLine()]);
  const removeLine = (index) => setLines((list) => list.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validation.count > 0) {
      setShowErrors(true);
      setError(`Please fix the ${validation.count} highlighted field${validation.count === 1 ? '' : 's'}.`);
      requestAnimationFrame(() => {
        document.querySelector('.inv-modal .inv-invalid input, .inv-modal .inv-invalid select')?.focus();
      });
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit(toSalePayload(header, lines));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const statusClass = `so-status so-${header.paymentStatus.toLowerCase()}`;

  return (
    <div className="inv-overlay">
      <form className="inv-modal so-modal qt-modal" onSubmit={handleSubmit} noValidate role="dialog" aria-modal="true"
        aria-label={invoice ? `Edit Sales Invoice ${invoiceNo}` : 'New Sales Invoice'}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="receipt" size={22} /></span>
          <div>
            <h2>{invoice ? 'Edit Sales Invoice' : 'New Sales Invoice'} <span className="so-no">{invoiceNo}</span></h2>
            <p>Invoice No auto-generated · Selling price is GST-inclusive · Stock auto-deducted</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          {error && <div className="alert">{error}</div>}

          <section className="inv-card so-card">
            <div className="so-grid so-grid-customer">
              <Field label="Invoice Date" required invalid={errors.header.invoiceDate}>
                <input type="date" value={header.invoiceDate} onChange={setField('invoiceDate')} />
              </Field>
              <Field label="Branch" required invalid={errors.header.branch}>
                <Select value={header.branch} onChange={setField('branch')} options={branches.map((b) => b.name)} />
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
                <ComboBox id={customerInputId} placeholder="Type or pick customer" value={header.customerName}
                  onChange={(v) => setCustomer({ target: { value: v } })} maxLength={200}
                  options={customers.map((c) => ({ value: c.name, label: c.name, hint: c.contactNo }))} />
                {errors.header.customerName && <small className="inv-error">Required</small>}
              </div>
              <Field label="Contact No" invalid={errors.header.contactNo} error="7–15 digits">
                <input type="tel" placeholder="Mobile no." value={header.contactNo} onChange={setField('contactNo')}
                  maxLength={15} />
              </Field>
              <Field label="City">
                <input placeholder="City" value={header.city} onChange={setField('city')} maxLength={100} />
              </Field>
              <Field label="State">
                <input placeholder="State" value={header.state} onChange={setField('state')} maxLength={100} />
              </Field>
              <Field label="Sales Channel">
                <Select value={header.salesChannel} onChange={setField('salesChannel')} options={SALES_CHANNELS} />
              </Field>
            </div>
          </section>

          <section className="inv-card so-card">
            <div className="so-grid so-grid-order">
              <Field label="Payment Method">
                <Select value={header.paymentMethod} onChange={setField('paymentMethod')} options={PAYMENT_METHODS} />
              </Field>
              <Field label="Payment Status" className={statusClass}>
                <Select value={header.paymentStatus} onChange={setField('paymentStatus')} options={PAYMENT_STATUSES} />
              </Field>
              <Field label="Order Status">
                <Select value={header.orderStatus} onChange={setField('orderStatus')} options={ORDER_STATUSES} />
              </Field>
              <Field label="Courier Partner">
                <input placeholder="e.g. Shiprocket" value={header.courierPartner}
                  onChange={setField('courierPartner')} maxLength={100} />
              </Field>
              <Field label="Tracking No">
                <input placeholder="AWB / tracking no." value={header.trackingNo} onChange={setField('trackingNo')}
                  maxLength={50} />
              </Field>
              <Field label="Shipping (₹)">
                <input type="number" min="0" step="any" className="inv-num" value={header.shipping}
                  onChange={setField('shipping')} />
              </Field>
              <Field label="Expenses (₹)">
                <input type="number" min="0" step="any" className="inv-num" value={header.expenses}
                  onChange={setField('expenses')} title="Packing, courier, commission… used for net profit" />
              </Field>
              <Field label="Round Off (₹)">
                <input type="number" step="any" className="inv-num" placeholder="e.g. -1" value={header.roundOff}
                  onChange={setField('roundOff')} title="Added to the bill total; use a minus to round down" />
              </Field>
              <Field label="Notes" className="so-notes">
                <input placeholder="Optional notes" value={header.notes} onChange={setField('notes')} maxLength={500} />
              </Field>
            </div>
          </section>

          <section className="inv-card so-card so-address">
            <div className="so-address-head">
              <button type="button" className="so-collapse" onClick={() => setAddressOpen((o) => !o)}>
                <Icon name={addressOpen ? 'chevronUp' : 'chevronDown'} size={16} />
                Billing &amp; Shipping Address
              </button>
              <label className="so-same">
                <input type="checkbox" checked={header.shippingSameAsBilling}
                  onChange={setField('shippingSameAsBilling')} />
                Shipping address same as billing
              </label>
            </div>
            {addressOpen && (
              <div className={`so-address-body${header.shippingSameAsBilling ? ' so-one' : ''}`}>
                <Field label={header.shippingSameAsBilling ? 'Billing & Shipping Address' : 'Billing Address'}>
                  <textarea rows={3} placeholder="Billing address…" value={header.billingAddress}
                    onChange={setField('billingAddress')} maxLength={500} />
                </Field>
                {/* The shipping box opens only when it differs from the billing address (box unticked). */}
                {!header.shippingSameAsBilling && (
                  <Field label="Shipping Address">
                    <textarea rows={3} placeholder="Shipping address…" maxLength={500}
                      value={header.shippingAddress} onChange={setField('shippingAddress')} />
                  </Field>
                )}
              </div>
            )}
          </section>

          <div className="inv-items-bar">
            <h3>Items <span className="inv-count">{lines.length}</span></h3>
            <button type="button" className="inv-btn-gold" onClick={addLine}>
              <Icon name="plusCircle" size={16} />
              Add Row
            </button>
          </div>


          {sellable.length === 0 && <p className="qt-tip">No SKUs in stock. Add a purchase invoice first.</p>}

          {/* One line per piece, with the bill's columns in the bill's order. */}
          <div className="inv-card so-lines so-bill">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU No<em> *</em></th>
                  <th>Description</th>
                  <th>HSN</th>
                  <th>Metal (KT)</th>
                  <th className="num">Qty</th>
                  <th className="num">Gross Wt</th>
                  <th className="num">Net Wt<em> *</em></th>
                  <th className="num">Metal Amt</th>
                  <th className="num">Dia Pcs</th>
                  <th className="num">Dia Wt</th>
                  <th className="num">Dia Amt</th>
                  <th className="num">Stone Pcs</th>
                  <th className="num">Stone Wt</th>
                  <th className="num">Stone Amt</th>
                  <th className="num">Making</th>
                  <th className="num">Amount</th>
                  <th className="num">GST %</th>
                  <th className="center">IGST</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const s = stockBySku.get(l.skuNo);
                  const e = errors.lines[i] ?? {};
                  const set = (field) => (ev) => changeLine(i, {
                    [field]: ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value,
                  });
                  const numCell = (field, label, { step = 'any', invalid = false } = {}) => (
                    <td className={`num${invalid ? ' inv-invalid' : ''}`}>
                      <input type="number" min="0" step={step} className="inv-num" value={l[field]} onChange={set(field)}
                        aria-label={label} />
                    </td>
                  );
                  const textCell = (field, label, placeholder, maxLength, className) => (
                    <td className={className}>
                      <input placeholder={placeholder} value={l[field]} onChange={set(field)} maxLength={maxLength}
                        aria-label={label} />
                    </td>
                  );
                  return (
                    // Rows have no id until saved, so the index is the key.
                    <tr key={i} aria-label={`Item ${i + 1}`}>
                      <td className="muted so-no">{i + 1}</td>
                      <td className={`so-sku${e.skuNo ? ' inv-invalid' : ''}`}>
                        <ComboBox placeholder="SKU…" value={l.skuNo} onChange={(v) => changeLine(i, { skuNo: v })}
                          options={skuOptions} aria-label="SKU" />
                        <small className={s || !l.skuNo ? 'muted' : 'inv-error'}>
                          {s ? `Stock ${s.available}` : l.skuNo ? 'Unknown SKU' : ' '}
                        </small>
                      </td>
                      {textCell('description', 'Description', 'AVORI KIDS BRACELET', 200, 'so-desc')}
                      {textCell('hsnSac', 'HSN/SAC', '7113', 20)}
                      {textCell('metalType', 'Metal (KT)', 'GOLD (18KT)', 100, 'so-metal')}
                      {numCell('qty', 'Qty', { step: '1', invalid: e.qty })}
                      {numCell('grossWeight', 'Gross Wt')}
                      {numCell('netWeight', 'Net Wt', { invalid: e.netWeight })}
                      {numCell('metalAmount', 'Metal Amt')}
                      {numCell('diaPcs', 'Dia Pcs')}
                      {numCell('diaWeight', 'Dia Wt')}
                      {numCell('diaAmount', 'Dia Amt')}
                      {numCell('stonePcs', 'Stone Pcs')}
                      {numCell('stoneWeight', 'Stone Wt')}
                      {numCell('stoneAmount', 'Stone Amt')}
                      {numCell('makingCharges', 'Making Charges')}
                      <td className={`num so-calc so-total${e.selling ? ' inv-invalid' : ''}`}>
                        ₹{formatAmount(saleLineAmount(l))}
                        {e.selling && <small className="inv-error">Enter amounts</small>}
                      </td>
                      {numCell('gstPercent', 'GST %')}
                      <td className="center">
                        <input type="checkbox" className="inv-check" checked={l.igst} onChange={set('igst')}
                          aria-label="IGST" title="Other state (IGST)" />
                      </td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" className="inv-icon-btn danger" aria-label="Remove row"
                            onClick={() => removeLine(i)}>
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="inv-summary-bar">
            <span className="inv-count-pill">{lines.length} item{lines.length === 1 ? '' : 's'}</span>
            <span>Payment: <b className={`so-pay so-${header.paymentStatus.toLowerCase()}`}>{header.paymentStatus}</b></span>
            <div className="inv-summary-right">
              <span>Taxable: <b className="inv-mono">₹{formatAmount(totals.taxable)}</b></span>
              {totals.igst > 0 && <span>IGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.igst)}</b></span>}
              <span>CGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.cgst)}</b></span>
              <span>SGST: <b className="inv-mono inv-mint">₹{formatAmount(totals.sgst)}</b></span>
              {totals.shipping > 0 && <span>Shipping: <b className="inv-mono">₹{formatAmount(totals.shipping)}</b></span>}
              {totals.adjust !== 0 && <span>Round Off: <b className="inv-mono">₹{formatAmount(totals.adjust)}</b></span>}
              <span className="inv-total-pill">₹{formatAmount(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <footer className="inv-footer">
          <span>Grand Total: <b className="inv-mono inv-big">₹{formatAmount(totals.grandTotal)}</b></span>
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
              <Icon name="save" size={16} />
              {saving ? 'Saving…' : invoice ? 'Save Changes' : 'Create Invoice'}
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

export default SalesInvoiceModal;
