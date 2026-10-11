// Inventory views built from purchases (stock in) and sales (stock out).
import { money, num } from './purchaseCalc';

const weight = (v) => Math.round(v * 1000) / 1000;

/** Totals over SKUs that are in stock. */
export function inventoryTotals(stock) {
  const inStock = stock.filter((s) => s.available > 0);
  return {
    skus: inStock.length,
    pcs: inStock.reduce((n, s) => n + s.available, 0),
    costValue: money(inStock.reduce((n, s) => n + s.available * s.costPerPiece, 0)),
    saleValue: money(inStock.reduce((n, s) => n + s.available * s.salePrice, 0)),
    netWeight: weight(inStock.reduce((n, s) => n + s.available * s.netWeight, 0)),
    outOfStock: stock.filter((s) => s.available <= 0).length,
  };
}

/** Where a SKU stands: nothing left = sold, some pieces gone = partly sold, otherwise in stock. */
export function stockStatus(s) {
  if (s.available <= 0) return { key: 'sold', label: 'Sold' };
  if (s.available < s.purchased) return { key: 'part', label: 'Partly Sold' };
  return { key: 'in', label: 'In Stock' };
}

/** Stock grouped by a SKU field (category, metalType, diamondType, supplierName), largest cost value first. */
export function inventoryByGroup(stock, field) {
  const groups = new Map();
  stock.forEach((s) => {
    const label = s[field] || '—';
    const g = groups.get(label) ?? { label, skus: 0, purchased: 0, sold: 0, pcs: 0, netWeight: 0, costValue: 0, saleValue: 0 };
    g.skus += 1;
    g.purchased += s.purchased;
    g.sold += s.purchased - s.available;
    g.pcs += s.available;
    g.netWeight += s.available * s.netWeight;
    g.costValue += s.available * s.costPerPiece;
    g.saleValue += s.available * s.salePrice;
    groups.set(label, g);
  });
  return [...groups.values()]
    .map((g) => ({ ...g, netWeight: weight(g.netWeight), costValue: money(g.costValue), saleValue: money(g.saleValue) }))
    .sort((a, b) => b.costValue - a.costValue || a.label.localeCompare(b.label));
}

/** Every stock movement, newest first: IN from purchase items, OUT from sale lines. */
export function stockMovements(drafts, sales) {
  const ins = drafts.flatMap((d) => d.items.map((i) => ({
    id: `in-${i.id}`,
    date: d.purchaseDate,
    type: 'IN',
    ref: d.supplierInvoiceNo || 'Purchase',
    party: d.supplierName,
    skuNo: i.skuNo,
    item: i.category,
    qty: num(i.qty),
    createdAt: d.createdAt ?? '',
  })));
  const outs = sales.flatMap((s) => s.lines.map((l, idx) => ({
    id: `out-${s.id}-${idx}`,
    date: s.invoiceDate,
    type: 'OUT',
    ref: s.invoiceNo,
    party: s.customerName,
    skuNo: l.skuNo,
    item: '',
    qty: -num(l.qty),
    createdAt: s.createdAt ?? '',
  })));
  return [...ins, ...outs].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}
