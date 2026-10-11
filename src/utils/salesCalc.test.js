import { calcSaleLine, calcSaleTotals } from './salesCalc';
import { saleProfit, stockList } from './draftSales';

test('selling price is GST-inclusive', () => {
  const r = calcSaleLine({ selling: '5150', qty: '2', gstPercent: '3', igst: false });
  expect(r.total).toBe(10300);
  expect(r.taxable).toBe(10000);
  expect(r.gst).toBe(300);
  expect([r.cgst, r.sgst, r.igst]).toEqual([150, 150, 0]);
});

test('IGST takes the whole GST and shipping is added to the rounded total', () => {
  const lines = [{ selling: '999.99', qty: '1', gstPercent: '3', igst: true }];
  const t = calcSaleTotals(lines, '50');
  expect(t.igst).toBe(29.13);
  expect(t.cgst).toBe(0);
  expect(t.grandTotal).toBe(1050);
  expect(t.roundOff).toBe(0.01);
});

test('stock is purchased qty minus sold qty, and one sale can be left out (editing)', () => {
  const invoices = [{
    id: 1, purchaseDate: '2026-06-20', supplierName: 'Leo Silver',
    items: [{ id: 1, skuNo: 'GEM-00001', category: 'Ring', qty: 3, price: 1000, gstPercent: 3, mrp: 3000, netWeight: 2 }],
  }];
  const sales = [
    { id: 'a', lines: [{ skuNo: 'GEM-00001', qty: 2 }] },
    { id: 'b', lines: [{ skuNo: 'GEM-00001', qty: 1 }] },
  ];
  expect(stockList(invoices, sales)[0]).toMatchObject({ purchased: 3, available: 0, costPerPiece: 1030 });
  expect(stockList(invoices, sales, 'b')[0].available).toBe(1);
});

test('sale profit matches the sales record sheet (CUSTOM01)', () => {
  const stock = new Map([['NAT-00001', { costPerPiece: 63683 }]]);
  const p = saleProfit({ expenses: 150, lines: [{ skuNo: 'NAT-00001', qty: 1, selling: 78600 }] }, stock);
  expect(p.gross).toBe(14917);
  expect(p.grossPercent).toBe(18.98);
  expect(p.net).toBe(14767);
  expect(p.netPercent).toBe(18.79);
});
