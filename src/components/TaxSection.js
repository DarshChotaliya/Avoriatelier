import Field from './Field';
import { formatAmount } from '../utils/purchaseCalc';

function TaxSection({ form, totals, onChange }) {
  const set = (field) => (value) => onChange(field, value);
  return (
    <section className="card">
      <h2>Tax &amp; Total</h2>
      <div className="grid">
        <Field label="Gross Amount" readOnly value={formatAmount(totals.grossAmount)} />
        <Field label="Discount" type="number" value={form.discount} onChange={set('discount')} />
        <Field label="Taxable Amount" readOnly value={formatAmount(totals.taxableAmount)} />
        <div className="grid-break" />
        <Field label="CGST %" type="number" max="100" value={form.cgstPercent} onChange={set('cgstPercent')} />
        <Field label="CGST Amount" readOnly value={formatAmount(totals.cgstAmount)} />
        <Field label="SGST %" type="number" max="100" value={form.sgstPercent} onChange={set('sgstPercent')} />
        <Field label="SGST Amount" readOnly value={formatAmount(totals.sgstAmount)} />
        <Field label="IGST %" type="number" max="100" value={form.igstPercent} onChange={set('igstPercent')} />
        <Field label="IGST Amount" readOnly value={formatAmount(totals.igstAmount)} />
        <div className="grid-break" />
        <Field label="Round Off" readOnly value={formatAmount(totals.roundOff)} />
      </div>
      <div className="net-amount">
        <span>Net Purchase Amount</span>
        <strong>₹ {formatAmount(totals.netPurchaseAmount)}</strong>
      </div>
    </section>
  );
}

export default TaxSection;
