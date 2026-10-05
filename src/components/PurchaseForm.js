import { useEffect, useMemo, useState } from 'react';
import Field from './Field';
import DiamondSection from './DiamondSection';
import GoldSection from './GoldSection';
import SilverSection from './SilverSection';
import TaxSection from './TaxSection';
import { purchaseApi } from '../api/purchaseApi';
import { calcTotals, num } from '../utils/purchaseCalc';
import {
  PAYMENT_TYPES, PURCHASE_TYPES, emptyDiamondItem, emptyGoldItem, emptySilverItem,
} from '../constants/purchaseOptions';

const ITEM_CONFIG = {
  Diamond: { key: 'diamondItems', empty: emptyDiamondItem, Section: DiamondSection },
  Gold: { key: 'goldItems', empty: emptyGoldItem, Section: GoldSection },
  Silver: { key: 'silverItems', empty: emptySilverItem, Section: SilverSection },
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  purchaseNo: '',
  purchaseDate: today(),
  supplierName: '',
  invoiceNo: '',
  purchaseType: 'Diamond',
  paymentType: 'Cash',
  remarks: '',
  discount: '',
  cgstPercent: '',
  sgstPercent: '',
  igstPercent: '',
  diamondItems: [emptyDiamondItem()],
  goldItems: [emptyGoldItem()],
  silverItems: [emptySilverItem()],
});

// API → form: nulls become '' and numbers become strings so inputs stay controlled.
const toFormValues = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v == null ? '' : typeof v === 'number' ? String(v) : v]));

function fromApi(p) {
  const form = { ...emptyForm(), ...toFormValues(p) };
  Object.values(ITEM_CONFIG).forEach(({ key, empty }) => {
    form[key] = p[key].length ? p[key].map(toFormValues) : [empty()];
  });
  return form;
}

const NUMERIC_FIELDS = new Set([
  'carat', 'quantity', 'ratePerCarat', 'discountPercent', 'grossWeight', 'stoneWeight', 'wastagePercent',
  'ratePerGram', 'makingCharges', 'otherCharges',
]);

const toItemPayload = ({ id, ...item }) =>
  Object.fromEntries(Object.entries(item).map(([k, v]) => {
    if (k === 'quantity') return [k, Math.trunc(num(v))];
    return [k, NUMERIC_FIELDS.has(k) ? num(v) : v || null];
  }));

function toPayload(form) {
  const { key } = ITEM_CONFIG[form.purchaseType];
  return {
    purchaseNo: form.purchaseNo.trim() || null,
    purchaseDate: form.purchaseDate,
    supplierName: form.supplierName,
    invoiceNo: form.invoiceNo || null,
    purchaseType: form.purchaseType,
    paymentType: form.paymentType,
    remarks: form.remarks || null,
    discount: num(form.discount),
    cgstPercent: num(form.cgstPercent),
    sgstPercent: num(form.sgstPercent),
    igstPercent: num(form.igstPercent),
    diamondItems: [],
    goldItems: [],
    silverItems: [],
    // Only send line items for the selected purchase type.
    [key]: form[key].map(toItemPayload),
  };
}

function PurchaseForm({ purchaseId, onSaved, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = purchaseId
      ? purchaseApi.get(purchaseId).then(fromApi)
      : purchaseApi.nextNumber().then(({ purchaseNo }) => ({ ...emptyForm(), purchaseNo }));

    load
      .then((data) => !cancelled && setForm(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  const totals = useMemo(() => calcTotals(form), [form]);
  const { key: itemsKey, empty: emptyItem, Section } = ITEM_CONFIG[form.purchaseType];

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const changeItem = (index, field, value) =>
    setForm((f) => ({
      ...f,
      [itemsKey]: f[itemsKey].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  const addItem = () => setForm((f) => ({ ...f, [itemsKey]: [...f[itemsKey], emptyItem()] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, [itemsKey]: f[itemsKey].filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (purchaseId) {
        await purchaseApi.update(purchaseId, payload);
      } else {
        await purchaseApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="purchase-form">
      <div className="page-header">
        <h1>{purchaseId ? 'Edit Purchase' : 'New Purchase'}</h1>
      </div>

      {error && <div className="alert">{error}</div>}

      <section className="card">
        <h2>Purchase Details</h2>
        <div className="grid">
          <Field label="Purchase No." value={form.purchaseNo} onChange={(v) => setField('purchaseNo', v)} />
          <Field label="Purchase Date" type="date" required value={form.purchaseDate}
            onChange={(v) => setField('purchaseDate', v)} />
          <Field label="Supplier Name" required value={form.supplierName}
            onChange={(v) => setField('supplierName', v)} />
          <Field label="Invoice No." value={form.invoiceNo} onChange={(v) => setField('invoiceNo', v)} />
          <Field label="Purchase Type" required value={form.purchaseType} options={PURCHASE_TYPES}
            onChange={(v) => setField('purchaseType', v)} />
          <Field label="Payment Type" required value={form.paymentType} options={PAYMENT_TYPES}
            onChange={(v) => setField('paymentType', v)} />
          <Field label="Remarks" type="textarea" value={form.remarks} onChange={(v) => setField('remarks', v)} />
        </div>
      </section>

      <Section items={form[itemsKey]} onChangeItem={changeItem} onAdd={addItem} onRemove={removeItem} />

      <TaxSection form={form} totals={totals} onChange={setField} />

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Purchase'}
        </button>
      </div>
    </form>
  );
}

export default PurchaseForm;
