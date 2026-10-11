import { useEffect, useId, useState } from 'react';
import ComboBox from './ComboBox';
import Icon from './Icon';
import { MasterForm } from './MasterPage';
import SelectBox from './SelectBox';
import { MASTER_PAGES } from '../constants/masterConfig';
import { ORDER_STATUSES } from '../utils/draftOrders';
import { formatAmount } from '../utils/purchaseCalc';
import { makeThumbnail } from '../utils/draftInvoices';
import './PurchaseInvoice.css';
import './MasterPage.css';
import './SalesInvoice.css';
import './Quotation.css';
import './Orders.css';

const today = () => new Date().toISOString().slice(0, 10);

const emptyOrder = (branches) => ({
  branch: branches[0]?.name ?? '',
  clientName: '',
  contactNo: '',
  clientOrderDate: today(),
  orderPlacedDate: '',
  cadConfirmedDate: '',
  deliveryDate: '',
  description: '',
  designRef: '',
  metalType: '',
  diamondType: '',
  qty: '1',
  manufacturer: '',
  status: 'Pending',
  completedDate: '',
  notes: '',
  quotationNo: '',
  amount: 0,
  advance: '',
  photo: '',
});

/** Field → message for every problem. Dates must follow the order flow (order → placed → CAD → delivery). */
export function validateOrder(o) {
  const e = {};
  if (!o.clientName.trim()) e.clientName = 'Required';
  if (!o.description.trim()) e.description = 'Required';
  if (!o.clientOrderDate) e.clientOrderDate = 'Required';
  if (!(Number(o.qty) >= 1)) e.qty = 'At least 1';
  if (o.contactNo.trim() && !/^[0-9+\-\s]{7,15}$/.test(o.contactNo.trim())) e.contactNo = '7–15 digits';
  const flow = [['orderPlacedDate', 'clientOrderDate'], ['cadConfirmedDate', 'orderPlacedDate'],
    ['deliveryDate', 'clientOrderDate']];
  flow.forEach(([later, earlier]) => {
    if (o[later] && o[earlier] && o[later] < o[earlier]) e[later] = 'Before an earlier step';
  });
  return e;
}

/** Empty dates and text go to the API as null; qty as a whole number. */
export const toOrderPayload = (v) => {
  const orNull = (x) => (String(x ?? '').trim() === '' ? null : x);
  return {
    ...v,
    clientName: v.clientName.trim(),
    qty: Math.trunc(Number(v.qty)),
    orderPlacedDate: orNull(v.orderPlacedDate),
    cadConfirmedDate: orNull(v.cadConfirmedDate),
    deliveryDate: orNull(v.deliveryDate),
    completedDate: orNull(v.completedDate),
    amount: Number(v.amount) || 0,
    advance: Number(v.advance) || 0,
    photo: v.photo || null,
  };
};

function Field({ label, required, error, className = '', children }) {
  return (
    <label className={`inv-cell ${className}${error ? ' inv-invalid' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {error && <small className="inv-error">{error}</small>}
    </label>
  );
}

/**
 * New / edit customer order (the client → manufacturer → CAD → delivery sheet). `initial` pre-fills a new order,
 * e.g. from an accepted quotation.
 */
function OrderModal({ order, initial, masters, onSave, onClose, onAddCustomer }) {
  const [values, setValues] = useState(() => {
    const base = { ...emptyOrder(masters.branches), ...initial };
    if (!order) return base;
    const loaded = Object.fromEntries(Object.entries(order).map(([k, v]) => [k, v ?? '']));
    return { ...base, ...loaded, qty: String(order.qty) };
  });
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const listId = useId();
  const clientInputId = `${listId}-client`;

  useEffect(() => {
    // Escape closes the order only when no form (e.g. New Customer) is open on top of it.
    const onKey = (e) => e.key === 'Escape' && document.querySelectorAll('.inv-overlay').length === 1 && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const problems = validateOrder(values);
  const errors = showErrors ? problems : {};
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const pick = (k) => (value) => setValues((v) => ({ ...v, [k]: value }));

  // A known customer fills the contact number.
  const setClient = (e) => {
    const name = e.target.value;
    const known = masters.customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setValues((v) => ({ ...v, clientName: name, ...(known?.contactNo ? { contactNo: known.contactNo } : {}) }));
  };

  const addCustomer = async (record) => {
    await onAddCustomer(record);
    setValues((v) => ({ ...v, clientName: record.name.trim(), contactNo: record.contactNo ?? '' }));
    setAddingCustomer(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (Object.keys(problems).length > 0) {
      setShowErrors(true);
      setError(`Please fix the ${Object.keys(problems).length} highlighted field(s).`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(toOrderPayload(values));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const names = (list) => list.map((r) => r.name);
  const pickPhoto = async (file) => {
    const photo = await makeThumbnail(file);
    if (photo) setValues((v) => ({ ...v, photo }));
  };
  const title = order ? `Edit Order ${order.orderNo}` : 'New Order';

  return (
    <div className="inv-overlay">
      <form className="inv-modal od-modal" onSubmit={submit} noValidate role="dialog" aria-modal="true"
        aria-label={title}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="clipboard" size={22} /></span>
          <div>
            <h2>{title}</h2>
            <p>Client order → placed with manufacturer → CAD confirmed → delivery</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          {values.quotationNo && (
            <p className="od-from-quote">
              <Icon name="list" size={15} />
              From quotation <b>{values.quotationNo}</b>
              {Number(values.amount) > 0 && <> · agreed amount <b>₹{formatAmount(values.amount)}</b></>}
            </p>
          )}

          <section className="inv-card">
            <h3 className="inv-section-title">Client &amp; Piece</h3>
            <div className="od-piece">
              {/* Reference picture of the design (comes from a custom quotation, or pick one). */}
              <label className="qt-photo od-photo" title="Design picture">
                {values.photo ? <img src={values.photo} alt="" /> : <><Icon name="camera" size={20} /><small>Photo</small></>}
                <input type="file" accept="image/*" hidden aria-label="Design photo"
                  onChange={(e) => e.target.files[0] && pickPhoto(e.target.files[0])} />
              </label>
            <div className="od-grid">
              {/* Not a <label> wrapper: the "New customer" button sits beside the label, outside it. */}
              <div className={`inv-cell cust-field od-span-2${errors.clientName ? ' inv-invalid' : ''}`}>
                <span>
                  <label htmlFor={clientInputId}>Client Name<em> *</em></label>
                  {onAddCustomer && (
                    <button type="button" className="cust-add" onClick={() => setAddingCustomer(true)}>
                      <Icon name="plus" size={13} />
                      New customer
                    </button>
                  )}
                </span>
                <ComboBox id={clientInputId} placeholder="Type or pick customer" value={values.clientName}
                  onChange={(v) => setClient({ target: { value: v } })} maxLength={200}
                  options={masters.customers.map((c) => ({ value: c.name, label: c.name, hint: c.contactNo }))} />
                {errors.clientName && <small className="inv-error">{errors.clientName}</small>}
              </div>
              <Field label="Contact No" error={errors.contactNo}>
                <input type="tel" placeholder="Mobile no." value={values.contactNo} onChange={set('contactNo')}
                  maxLength={15} />
              </Field>
              <Field label="Branch">
                <SelectBox value={values.branch} aria-label="Branch" options={names(masters.branches)}
                  onChange={pick('branch')} />
              </Field>
              <Field label="Description" required error={errors.description} className="od-span-2">
                <input placeholder="e.g. CQ SET, TANISHQ SET" value={values.description} onChange={set('description')}
                  maxLength={200} />
              </Field>
              <Field label="Design Ref / SKU">
                <input placeholder="e.g. CQ390" value={values.designRef} onChange={set('designRef')} maxLength={50} />
              </Field>
              <Field label="Qty" required error={errors.qty}>
                <input type="number" min="1" step="1" className="inv-num" value={values.qty} onChange={set('qty')} />
              </Field>
              <Field label="Metal">
                <SelectBox value={values.metalType} aria-label="Metal" options={names(masters.metalTypes)}
                  allowEmpty placeholder="—" onChange={pick('metalType')} />
              </Field>
              <Field label="Diamond">
                <SelectBox value={values.diamondType} aria-label="Diamond" options={names(masters.diamondTypes)}
                  allowEmpty placeholder="—" onChange={pick('diamondType')} />
              </Field>
              <Field label="Manufacturer" className="od-span-2">
                <SelectBox value={values.manufacturer} aria-label="Manufacturer" options={names(masters.suppliers)}
                  allowEmpty placeholder="—" onChange={pick('manufacturer')} />
              </Field>
            </div>
            </div>
          </section>

          <section className="inv-card">
            <h3 className="inv-section-title">Timeline &amp; Status</h3>
            <div className="od-grid">
              <Field label="Client Order Date" required error={errors.clientOrderDate}>
                <input type="date" value={values.clientOrderDate} onChange={set('clientOrderDate')} />
              </Field>
              <Field label="Order Placed" error={errors.orderPlacedDate}>
                <input type="date" value={values.orderPlacedDate} onChange={set('orderPlacedDate')} />
              </Field>
              <Field label="CAD Confirmed" error={errors.cadConfirmedDate}>
                <input type="date" value={values.cadConfirmedDate} onChange={set('cadConfirmedDate')} />
              </Field>
              <Field label="Delivery Date" error={errors.deliveryDate}>
                <input type="date" value={values.deliveryDate} onChange={set('deliveryDate')} />
              </Field>
              <Field label="Status">
                <SelectBox value={values.status} aria-label="Status" options={ORDER_STATUSES} onChange={pick('status')} />
              </Field>
              <Field label="Order Completed">
                <input type="date" value={values.completedDate} onChange={set('completedDate')}
                  title="Filled in automatically when the status is Delivered" />
              </Field>
              <Field label="Advance (₹)">
                <input type="number" min="0" step="any" className="inv-num" placeholder="0" value={values.advance}
                  onChange={set('advance')} />
              </Field>
              <Field label="Notes">
                <input placeholder="Optional notes" value={values.notes} onChange={set('notes')} maxLength={500} />
              </Field>
            </div>
          </section>
        </div>

        <footer className="inv-footer">
          <span className={`od-status od-${values.status.toLowerCase().replace(/\s+/g, '-')}`}>{values.status}</span>
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
              <Icon name="save" size={16} />
              {saving ? 'Saving…' : order ? 'Save Order' : 'Create Order'}
            </button>
          </div>
        </footer>
      </form>
      {addingCustomer && (
        <MasterForm config={MASTER_PAGES.customers} initial={{ name: values.clientName.trim() }}
          onSave={addCustomer} onClose={() => setAddingCustomer(false)} />
      )}
    </div>
  );
}

export default OrderModal;
