// Live totals for the quotation screen (mirrors QuotationCalculator in api/Services/QuotationService.cs).
import { money, num, weight } from './purchaseCalc';

export const LABOUR_TYPES = [
  { value: 'perGram', label: '₹ / g' },
  { value: 'percent', label: '% of metal' },
];

export const QUOTATION_STATUSES = ['Open', 'Accepted', 'Rejected'];

/** The metal's weight factor (S925 silver = 1); a missing or zero factor counts as 1. */
const factorOf = (metalTypes, name) => num(metalTypes.find((m) => m.name === name)?.weightFactor) || 1;

/** Net weight of the same design in another metal: weight × (to factor ÷ from factor). */
export const convertWeight = (grams, fromMetal, toMetal, metalTypes) =>
  weight(num(grams) * (factorOf(metalTypes, toMetal) / factorOf(metalTypes, fromMetal)));

/**
 * Per line, before GST:
 *   Metal   = Weight × Metal rate/g
 *   Labour  = ₹/g: Weight × Labour rate · %: Metal × Labour rate %
 *   Diamond = Diamond ct × Rate per ct
 *   Taxable = (Metal + Labour + Diamond + Stones + Other) × Qty + CAD charge (once)
 *   GST     = Taxable × GST %;  Total = Taxable + GST
 */
export function calcQuoteLine(line) {
  const metal = money(num(line.weight) * num(line.metalRate));
  const labour = money(line.labourType === 'percent'
    ? metal * num(line.labourRate) / 100
    : num(line.weight) * num(line.labourRate));
  const diamond = money(num(line.diamondCt) * num(line.diamondRate));
  const perPiece = metal + labour + diamond + num(line.stoneAmount) + num(line.otherCharges);
  const taxable = money(perPiece * (num(line.qty) || 1) + num(line.cadCharge));
  const gst = money(taxable * num(line.gstPercent) / 100);
  return { metal, labour, diamond, taxable, gst, total: money(taxable + gst) };
}

/** Quotation totals; the grand total is rounded to rupees, and the balance is what is left after the advance. */
export function calcQuoteTotals(lines, advance = 0) {
  const rows = lines.map(calcQuoteLine);
  const sum = (key) => money(rows.reduce((s, r) => s + r[key], 0));
  const grandTotal = Math.round(sum('total'));
  return { taxable: sum('taxable'), gst: sum('gst'), grandTotal, advance: money(num(advance)),
    balance: money(grandTotal - num(advance)) };
}
