// Figures for the dashboard, built from the same browser-stored purchases, sales and orders.
import { calcInvoiceTotals } from './invoiceCalc';
import { calcSaleTotals } from './salesCalc';
import { saleProfit } from './draftSales';
import { money } from './purchaseCalc';

const monthKey = (iso) => iso.slice(0, 7);

/** The last `count` months ending with the month of `todayIso`, oldest first: [{ key: '2026-10', label: 'Oct' }]. */
export function lastMonths(todayIso, count) {
  const [y, m] = todayIso.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
      year: d.getUTCFullYear(),
    };
  });
}

/** Sales, purchases and gross profit per month for the last `count` months. */
export function monthlyFigures(drafts, sales, stockBySku, todayIso, count = 6) {
  const months = lastMonths(todayIso, count).map((m) => ({ ...m, sales: 0, purchases: 0, gross: 0, invoices: 0 }));
  const byKey = new Map(months.map((m) => [m.key, m]));
  sales.forEach((s) => {
    const m = byKey.get(monthKey(s.invoiceDate));
    if (!m) return;
    m.sales += calcSaleTotals(s.lines, s.shipping, s.roundOff).grandTotal;
    m.gross += saleProfit(s, stockBySku).gross;
    m.invoices += 1;
  });
  drafts.forEach((d) => {
    const m = byKey.get(monthKey(d.purchaseDate));
    if (m) m.purchases += calcInvoiceTotals(d.items).grandTotal;
  });
  return months.map((m) => ({ ...m, sales: money(m.sales), purchases: money(m.purchases), gross: money(m.gross) }));
}

/** A round axis maximum at or above `value` (1, 2, 2.5 or 5 × a power of ten). */
export function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value);
  return step * power;
}
