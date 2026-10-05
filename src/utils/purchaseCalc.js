// Mirrors api/Services/PurchaseCalculator.cs so the form can show live totals.
// The API recalculates everything on save; these values are for display only.

const roundTo = (value, places) => {
  const factor = 10 ** places;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * factor + Number.EPSILON)) / factor;
};

export const money = (v) => roundTo(v, 2);
export const weight = (v) => roundTo(v, 3);
export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function calcDiamond(item) {
  const base = num(item.carat) * num(item.ratePerCarat);
  return { amount: money(base - (base * num(item.discountPercent)) / 100) };
}

export function calcGold(item) {
  const netWeight = weight(num(item.grossWeight) - num(item.stoneWeight));
  const wastageWeight = weight((netWeight * num(item.wastagePercent)) / 100);
  const chargeableWeight = weight(netWeight + wastageWeight);
  const goldValue = money(chargeableWeight * num(item.ratePerGram));
  const amount = money(goldValue + num(item.makingCharges) + num(item.otherCharges));
  return { netWeight, wastageWeight, chargeableWeight, goldValue, amount };
}

export function calcSilver(item) {
  const netWeight = weight(num(item.grossWeight) - num(item.stoneWeight));
  const silverValue = money(netWeight * num(item.ratePerGram));
  const amount = money(silverValue + num(item.makingCharges) + num(item.otherCharges));
  return { netWeight, silverValue, amount };
}

const itemCalculators = {
  Diamond: { key: 'diamondItems', calc: calcDiamond },
  Gold: { key: 'goldItems', calc: calcGold },
  Silver: { key: 'silverItems', calc: calcSilver },
};

export function calcTotals(form) {
  const { key, calc } = itemCalculators[form.purchaseType];
  const grossAmount = money(form[key].reduce((sum, item) => sum + calc(item).amount, 0));
  const taxableAmount = money(grossAmount - num(form.discount));
  const cgstAmount = money((taxableAmount * num(form.cgstPercent)) / 100);
  const sgstAmount = money((taxableAmount * num(form.sgstPercent)) / 100);
  const igstAmount = money((taxableAmount * num(form.igstPercent)) / 100);
  const total = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const netPurchaseAmount = roundTo(total, 0);
  const roundOff = money(netPurchaseAmount - total);
  return { grossAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, roundOff, netPurchaseAmount };
}

export const formatAmount = (v) =>
  num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatWeight = (v) =>
  num(v).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
