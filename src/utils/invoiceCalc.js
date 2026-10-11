// Live totals for the purchase invoice screen, laid out like the supplier packing list
// (metal + diamonds + stones + labour + hallmark). Kept in one file so formulas are easy to correct.
import { money, num } from './purchaseCalc';

const weight = (v) => Math.round(num(v) * 1000) / 1000;

/** Hallmarking is a service, so it carries 18% GST while the jewellery itself carries the item's GST % (3%). */
export const HALLMARK_GST_PERCENT = 18;

/** Purchase price of one piece including GST: jewellery at its GST %, hallmark at 18%. */
export const priceWithGst = (price, hallmark, gstPercent) => {
  const h = Math.min(num(hallmark), num(price));
  return money((num(price) - h) * (1 + num(gstPercent) / 100) + h * (1 + HALLMARK_GST_PERCENT / 100));
};

/** Loose stones: Wt × rate per carat. Single stones: Pcs × rate per piece (their weight is only the total). */
export const stoneAmount = (s) => money(s.pricing === 'perCert' ? num(s.pcs) * num(s.rate) : num(s.weight) * num(s.rate));
export const diamondAmount = (d) => money(num(d.weight) * num(d.rate));

/**
 * One edit to a diamond row, keeping Amount = Wt × Rate. Once an amount is typed (the bill total), typing the rate
 * works out the weight and typing the weight works out the rate; without a typed amount, the amount follows Wt × Rate.
 */
export function diamondRowChange(row, field, value) {
  const next = { ...row, [field]: value };
  const fixed = String(next.amount ?? '').trim() !== '' && row.amountTyped;
  const amount = num(next.amount);
  if (field === 'amount') {
    next.amountTyped = String(value).trim() !== '';
    if (!next.amountTyped) return next;
    if (num(next.rate) > 0) next.weight = String(Math.round((amount / num(next.rate)) * 1000) / 1000);
    else if (num(next.weight) > 0) next.rate = String(money(amount / num(next.weight)));
  } else if (field === 'rate' && fixed && num(value) > 0) {
    next.weight = String(Math.round((amount / num(value)) * 1000) / 1000);
  } else if (field === 'weight' && fixed && num(value) > 0) {
    next.rate = String(money(amount / num(value)));
  } else if (field === 'rate' || field === 'weight') {
    next.amount = num(next.weight) > 0 && num(next.rate) > 0 ? String(diamondAmount(next)) : '';
  }
  return next;
}

/**
 * Per piece:
 *   Metal     = Net Wt × Metal rate/g
 *   Diamond   = Σ Wt (ct) × Rate/ct
 *   Stone     = Σ per Ct: Wt × Rate · per Cert: Pcs × Rate
 *   Labour    = max(Net Wt × Labour/g, Labour minimum)   (0 when there is no net weight)
 *   Cost / pc = Metal + Diamond + Stone + Labour + Hallmark + Other
 * Line:
 *   Purchase  = Cost / pc × Qty
 *   GST       = (Purchase − Hallmark × Qty) × GST %  +  Hallmark × Qty × 18%
 *               (IGST if ticked, else half CGST + half SGST)
 *   Sale Price = MRP − Discount
 */
export function calcInvoiceItem(item) {
  const qty = num(item.qty);
  const netWeight = num(item.netWeight);
  const metal = money(netWeight * num(item.metalRate));
  const diamonds = money((item.diamonds ?? []).reduce((s, d) => s + diamondAmount(d), 0));
  const stones = money((item.stones ?? []).reduce((s, st) => s + stoneAmount(st), 0));
  const labour = netWeight > 0 ? money(Math.max(netWeight * num(item.labourRate), num(item.labourMinimum))) : 0;
  const hallmark = money(num(item.hallmark));
  const other = money(num(item.otherCharges));
  const costPerPiece = money(metal + diamonds + stones + labour + hallmark + other);

  const purchase = money(costPerPiece * qty);
  const hallmarkTotal = money(hallmark * qty);
  const goodsGst = money(((purchase - hallmarkTotal) * num(item.gstPercent)) / 100);
  const hallmarkGst = money((hallmarkTotal * HALLMARK_GST_PERCENT) / 100);
  const gstAmount = money(goodsGst + hallmarkGst);
  const igst = item.igst ? gstAmount : 0;
  const cgst = item.igst ? 0 : money(gstAmount / 2);
  return {
    metal,
    diamonds,
    stones,
    labour,
    hallmark,
    other,
    costPerPiece,
    purchase,
    goodsGst,
    hallmarkGst,
    gstAmount,
    cgst,
    sgst: item.igst ? 0 : money(gstAmount - cgst),
    igst,
    grossAmount: money(purchase + gstAmount),
    salePrice: money(num(item.mrp) - num(item.discount)),
    totalNetWeight: weight(netWeight * qty),
    stoneCt: weight((item.stones ?? []).reduce((s, st) => s + num(st.weight), 0) * qty),
  };
}

export function calcInvoiceTotals(items) {
  const rows = items.map(calcInvoiceItem);
  const sum = (key) => money(rows.reduce((s, r) => s + r[key], 0));
  const exact = rows.reduce((s, r) => s + r.grossAmount, 0);
  const grandTotal = Math.round(exact);
  return {
    taxable: sum('purchase'),
    cgst: sum('cgst'),
    sgst: sum('sgst'),
    igst: sum('igst'),
    roundOff: money(grandTotal - exact),
    grandTotal,
    netWeight: weight(rows.reduce((s, r) => s + r.totalNetWeight, 0)),
    stoneCt: weight(rows.reduce((s, r) => s + r.stoneCt, 0)),
  };
}
