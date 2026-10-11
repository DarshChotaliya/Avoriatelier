import { lastMonths, monthlyFigures, niceMax } from './dashboard';

test('last months run oldest first and cross the year boundary', () => {
  expect(lastMonths('2026-02-15', 3).map((m) => m.key)).toEqual(['2025-12', '2026-01', '2026-02']);
});

test('sales, purchases and gross profit land in their month', () => {
  const stock = new Map([['AD-00001', { costPerPiece: 1000 }]]);
  const sales = [
    { invoiceDate: '2026-10-03', shipping: 0, expenses: 0,
      lines: [{ skuNo: 'AD-00001', qty: 1, selling: 2500, gstPercent: 3, igst: false }] },
    { invoiceDate: '2026-01-10', shipping: 0, lines: [{ skuNo: 'AD-00001', qty: 1, selling: 999 }] },
  ];
  const drafts = [{ purchaseDate: '2026-09-20', items: [{ qty: 1, netWeight: 1, metalRate: 1000, gstPercent: 0 }] }];
  const months = monthlyFigures(drafts, sales, stock, '2026-10-05', 2);
  expect(months).toMatchObject([
    { key: '2026-09', sales: 0, purchases: 1000, invoices: 0 },
    { key: '2026-10', sales: 2500, gross: 1500, invoices: 1 },
  ]);
});

test('axis maximum rounds up to a readable number', () => {
  expect([niceMax(0), niceMax(7), niceMax(180000), niceMax(23000)]).toEqual([1, 10, 200000, 25000]);
});
