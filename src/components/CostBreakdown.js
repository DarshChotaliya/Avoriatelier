import { HALLMARK_GST_PERCENT } from '../utils/invoiceCalc';
import { formatAmount, num } from '../utils/purchaseCalc';
import './CostBreakdown.css';

const money = (v) => `₹${formatAmount(v)}`;

function Step({ op, label, value, tone }) {
  return (
    <>
      {op && <span className="cb-op" aria-hidden="true">{op}</span>}
      <div className={`cb-step${tone ? ` cb-${tone}` : ''}`}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </>
  );
}

/**
 * How one item's amount is built:
 * Metal + Diamond + Stone + Labour + Hallmark (+ Other) = Cost/pc × Qty + GST = Gross.
 * `c` is the result of calcInvoiceItem(item).
 */
function CostBreakdown({ item, c }) {
  return (
    <div className="cb" aria-label="Cost breakdown">
      <Step label="Metal" value={money(c.metal)} />
      <Step op="+" label="Diamond" value={money(c.diamonds)} />
      <Step op="+" label="Stone" value={money(c.stones)} />
      <Step op="+" label="Labour" value={money(c.labour)} />
      <Step op="+" label="Hallmark" value={money(c.hallmark)} />
      {c.other > 0 && <Step op="+" label="Other" value={money(c.other)} />}
      <Step op="=" label="Cost / pc" value={money(c.costPerPiece)} tone="sub" />
      <Step op="×" label="Qty" value={num(item.qty)} />
      {/* CGST + SGST or IGST is shown in the invoice header. */}
      <Step op="+" label={`GST ${num(item.gstPercent)}%`} value={money(c.goodsGst)} />
      {c.hallmarkGst > 0 && (
        <Step op="+" label={`Hallmark GST ${HALLMARK_GST_PERCENT}%`} value={money(c.hallmarkGst)} />
      )}
      <Step op="=" label="Gross" value={money(c.grossAmount)} tone="total" />
    </div>
  );
}

export default CostBreakdown;
