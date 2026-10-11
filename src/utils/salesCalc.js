// Live totals for the sales invoice screen. Selling prices are GST-inclusive.
import { money, num } from './purchaseCalc';

/**
 * Per line:
 *   Total    = Selling × Qty            (what the customer pays, GST included)
 *   Taxable  = Total ÷ (1 + GST %)
 *   GST      = Total − Taxable          (IGST if ticked, else half CGST + half SGST)
 */
export function calcSaleLine(line) {
  const total = money(num(line.selling) * num(line.qty));
  const taxable = money(total / (1 + num(line.gstPercent) / 100));
  const gst = money(total - taxable);
  const igst = line.igst ? gst : 0;
  const cgst = line.igst ? 0 : money(gst / 2);
  return { total, taxable, gst, cgst, sgst: line.igst ? 0 : money(gst - cgst), igst };
}

/**
 * The bill amount of a line, as on the invoice sheet: Metal + Diamond + Stone + Making (for all its pieces).
 * Lines without that break-up (older sales) fall back to Selling × Qty.
 */
export function saleLineAmount(line) {
  const parts = money(num(line.metalAmount) + num(line.diaAmount) + num(line.stoneAmount) + num(line.makingCharges));
  return parts > 0 ? parts : money(num(line.selling) * num(line.qty));
}

/**
 * Invoice totals; shipping is added on top and the total is rounded to rupees. `adjust` is the bill's manual
 * round-off (e.g. −1 so ₹1,06,531 is payable as ₹1,06,530); the grand total is what the customer pays.
 */
export function calcSaleTotals(lines, shipping, adjust = 0) {
  const rows = lines.map(calcSaleLine);
  const sum = (key) => money(rows.reduce((s, r) => s + r[key], 0));
  const exact = sum('total') + num(shipping);
  const grandTotal = Math.round(exact) + money(num(adjust));
  return {
    taxable: sum('taxable'),
    gst: sum('gst'),
    cgst: sum('cgst'),
    sgst: sum('sgst'),
    igst: sum('igst'),
    itemsTotal: sum('total'),
    shipping: money(num(shipping)),
    roundOff: money(grandTotal - exact),
    adjust: money(num(adjust)),
    grandTotal,
  };
}
