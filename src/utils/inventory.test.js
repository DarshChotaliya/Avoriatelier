import { inventoryByGroup, inventoryTotals, stockMovements, stockStatus } from './inventory';

const stock = [
  { skuNo: 'AD-00001', category: 'Ring', metalType: 'S925', purchased: 3, available: 2, costPerPiece: 1000,
    salePrice: 2500, netWeight: 2.5 },
  { skuNo: 'AD-00002', category: 'Ring', metalType: '18KT', purchased: 1, available: 0, costPerPiece: 5000,
    salePrice: 9000, netWeight: 3 },
  { skuNo: 'GEM-00001', category: 'Pendant', metalType: 'S925', purchased: 1, available: 1, costPerPiece: 800,
    salePrice: 2000, netWeight: 1.234 },
];

test('totals count only what is in stock', () => {
  expect(inventoryTotals(stock)).toEqual({
    skus: 2, pcs: 3, costValue: 2800, saleValue: 7000, netWeight: 6.234, outOfStock: 1,
  });
});

test('a SKU is in stock, partly sold or sold', () => {
  expect(stock.map((s) => stockStatus(s).label)).toEqual(['Partly Sold', 'Sold', 'In Stock']);
});

test('grouping adds purchased, sold and remaining stock per group', () => {
  const [ring, pendant] = inventoryByGroup(stock, 'category');
  expect(ring).toMatchObject({ label: 'Ring', skus: 2, purchased: 4, sold: 2, pcs: 2, costValue: 2000 });
  expect(pendant).toMatchObject({ label: 'Pendant', pcs: 1, netWeight: 1.234 });
});

test('movements list purchases as IN and sales as OUT, newest first', () => {
  const drafts = [{ purchaseDate: '2026-06-20', supplierName: 'Lurba', supplierInvoiceNo: 'JS/178',
    items: [{ id: 'p1', skuNo: 'AD-00001', category: 'Ring', qty: 3 }] }];
  const sales = [{ id: 's1', invoiceDate: '2026-07-01', invoiceNo: 'SAL-00001', customerName: 'Riya',
    lines: [{ skuNo: 'AD-00001', qty: 1 }] }];
  expect(stockMovements(drafts, sales).map((m) => [m.type, m.ref, m.qty])).toEqual([
    ['OUT', 'SAL-00001', -1],
    ['IN', 'JS/178', 3],
  ]);
});
