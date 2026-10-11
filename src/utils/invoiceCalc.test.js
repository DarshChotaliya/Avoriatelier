import { calcInvoiceItem, calcInvoiceTotals, diamondRowChange, priceWithGst, stoneAmount } from './invoiceCalc';

// Item 1 of the Lurba packing list JS/26-27/178 (CLE-0314-B).
const lurbaItem1 = {
  qty: '1', netWeight: '0.474', metalRate: '246.98', labourRate: '500', labourMinimum: '500', hallmark: '140',
  gstPercent: '3', igst: false, diamonds: [],
  stones: [{ stoneType: 'CZ PRN', pricing: 'perCt', pcs: '2', weight: '0.440', rate: '250' }],
};

test('matches the supplier bill: metal + stone + labour (minimum) + hallmark', () => {
  const r = calcInvoiceItem(lurbaItem1);
  expect(r.metal).toBe(117.07);
  expect(r.stones).toBe(110);
  expect(r.labour).toBe(500);
  expect(r.costPerPiece).toBe(867.07);
});

test('labour above the minimum is net weight × rate (item 2: 1.237 g)', () => {
  expect(calcInvoiceItem({ ...lurbaItem1, netWeight: '1.237', stones: [] }).labour).toBe(618.5);
});

test('loose stones are priced per carat, single stones per certificate', () => {
  expect(stoneAmount({ pricing: 'perCt', pcs: '2', weight: '0.5', rate: '250' })).toBe(125);
  expect(stoneAmount({ pricing: 'perCert', pcs: '2', weight: '0.5', rate: '8000' })).toBe(16000);
});

test('diamonds, qty, GST and sale price', () => {
  const r = calcInvoiceItem({
    ...lurbaItem1, qty: '2', diamonds: [{ weight: '0.1', rate: '50000' }], mrp: '9000', discount: '1000',
  });
  expect(r.diamonds).toBe(5000);
  expect(r.costPerPiece).toBe(5867.07);
  expect(r.purchase).toBe(11734.14);
  // 3% on (11,734.14 − 280 hallmark) = 343.62, plus 18% on the 280 hallmark = 50.40.
  expect(r.gstAmount).toBe(394.02);
  expect([r.cgst, r.sgst]).toEqual([197.01, 197.01]);
  expect(r.salePrice).toBe(8000);
});

test('totals add items, weights and round the grand total', () => {
  const t = calcInvoiceTotals([lurbaItem1, { ...lurbaItem1, igst: true }]);
  expect(t.taxable).toBe(1734.14);
  expect(t.igst).toBe(47.01);
  expect(t.netWeight).toBe(0.948);
  expect(t.stoneCt).toBe(0.88);
  expect(t.grandTotal).toBe(1828);
});

test('hallmark carries 18% GST while the jewellery carries its own GST %', () => {
  // The ring from the screenshot: metal 61,000 + stone 11,000 + labour 500 + hallmark 70 = 72,570 per piece.
  const c = calcInvoiceItem({
    qty: '1', netWeight: '0.5', metalRate: '122000', labourRate: '1000', hallmark: '70', gstPercent: '3',
    stones: [{ pricing: 'perCt', pcs: '1', weight: '2', rate: '5500' }],
  });
  expect(c.costPerPiece).toBe(72570);
  expect(c.goodsGst).toBe(2175);
  expect(c.hallmarkGst).toBe(12.6);
  expect(c.gstAmount).toBe(2187.6);
  expect(c.grossAmount).toBe(74757.6);
  expect(priceWithGst(72570, 70, 3)).toBe(74757.6);
});

test('diamond rows: amount typed first, then the rate gives the weight or the weight gives the rate', () => {
  let row = diamondRowChange({ pcs: '50', rate: '', weight: '', amount: '' }, 'amount', '250');
  row = diamondRowChange(row, 'rate', '1000');
  expect(row.weight).toBe('0.25');
  row = diamondRowChange(row, 'weight', '0.5');
  expect(row.rate).toBe('500');
  expect(row.amount).toBe('250');
});

test('diamond rows without a typed amount: amount = Wt × Rate', () => {
  let row = diamondRowChange({ rate: '', weight: '', amount: '' }, 'weight', '1');
  row = diamondRowChange(row, 'rate', '250');
  expect(row.amount).toBe('250');
});
