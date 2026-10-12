// Live totals for the purchase invoice screen, laid out like the supplier packing list
// (metal + diamonds + stones + labour + hallmark). Kept in one file so formulas are easy to correct.
import { money, num } from './purchaseCalc';

const weight = (v) => Math.round(num(v) * 1000) / 1000;

/** Hallmarking is a service: its 18% GST comes on top of the item's own GST. */
export const HALLMARK_GST_PERCENT = 18;

/**
 * Purchase price of one piece including GST: the item's GST % on the whole price (hallmark included, as on the
 * supplier bill) plus 18% on the hallmark charge.
 */
export const priceWithGst = (price, hallmark, gstPercent) =>
  money(num(price) * (1 + num(gstPercent) / 100) + (num(hallmark) * HALLMARK_GST_PERCENT) / 100);

/** Loose stones: Wt × rate per carat. Single stones: Pcs × rate per piece (their weight is only the total). */
export const stoneAmount = (s) => money(s.pricing === 'perCert' ? num(s.pcs) * num(s.rate) : num(s.weight) * num(s.rate));
export const diamondAmount = (d) => money(num(d.weight) * num(d.rate));

/** Carats of one diamond in a row: Wt (ct) ÷ Pcs (0 without pieces). */
export const diamondCtsPerPiece = (d) => (num(d.pcs) > 0 ? weight(num(d.weight) / num(d.pcs)) : 0);

/** A diamond or stone row's weight in grams: 1 carat = 0.2 g, so Wt (ct) ÷ 5. */
export const diamondGrams = (d) => weight(num(d.weight) / 5);

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

/** Gross and worked-out weights may differ by this much (grams) before it counts as a mismatch: bill rounding. */
export const WEIGHT_TOLERANCE = 0.005;

/**
 * Gross weight check for one piece: Gross Wt should be Net Wt (metal) + stones + diamonds, with carats turned into
 * grams (÷ 5). Returns null until both weights are typed; `diff` = Gross − expected.
 */
export function weightCheck(item) {
  const gross = num(item.grossWeight);
  const net = num(item.netWeight);
  if (gross <= 0 || net <= 0) return null;
  const grams = (rows) => weight((rows ?? []).reduce((s, r) => s + num(r.weight), 0) / 5);
  const stones = grams(item.stones);
  const diamonds = grams(item.diamonds);
  const expected = weight(net + stones + diamonds);
  const diff = weight(gross - expected);
  return { gross, net, stones, diamonds, expected, diff, ok: Math.abs(diff) <= WEIGHT_TOLERANCE };
}

/**
 * Per piece:
 *   Metal     = Net Wt × Metal rate/g
 *   Diamond   = Σ Wt (ct) × Rate/ct
 *   Stone     = Σ per Ct: Wt × Rate · per Cert: Pcs × Rate
 *   Labour    = fixed labour: the typed amount as it is · otherwise max(Net Wt × Labour/g, Labour minimum)
 *               (0 when there is no net weight)
 *   Total     = Metal + Labour + Hallmark
 *   Cost / pc = Total + Diamond + Stone + Other
 * Line:
 *   Purchase  = Cost / pc × Qty
 *   GST       = Purchase × GST %  +  Hallmark × Qty × 18%
 *               (IGST if ticked, else half CGST + half SGST)
 *   Sale Price = MRP − Discount
 */
export function calcInvoiceItem(item) {
  const qty = num(item.qty);
  const netWeight = num(item.netWeight);
  const metal = money(netWeight * num(item.metalRate));
  const diamonds = money((item.diamonds ?? []).reduce((s, d) => s + diamondAmount(d), 0));
  const stones = money((item.stones ?? []).reduce((s, st) => s + stoneAmount(st), 0));
  const perGramLabour = netWeight > 0 ? money(Math.max(netWeight * num(item.labourRate), num(item.labourMinimum))) : 0;
  const labour = item.labourFixed ? money(num(item.labourRate)) : perGramLabour;
  const hallmark = money(num(item.hallmark));
  const other = money(num(item.otherCharges));
  const costPerPiece = money(metal + diamonds + stones + labour + hallmark + other);

  const purchase = money(costPerPiece * qty);
  const goodsGst = money((purchase * num(item.gstPercent)) / 100);
  const hallmarkGst = money((hallmark * qty * HALLMARK_GST_PERCENT) / 100);
  const gstAmount = money(goodsGst + hallmarkGst);
  const igst = item.igst ? gstAmount : 0;
  const cgst = item.igst ? 0 : money(gstAmount / 2);
  return {
    metal,
    diamonds,
    stones,
    labour,
    hallmark,
    baseTotal: money(metal + labour + hallmark),
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
