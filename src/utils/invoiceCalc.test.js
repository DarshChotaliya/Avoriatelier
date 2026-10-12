import {
  calcInvoiceItem, calcInvoiceTotals, diamondCtsPerPiece, diamondGrams, diamondRowChange, priceWithGst, stoneAmount,
  weightCheck,
} from './invoiceCalc';

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
  // 3% on the whole 11,734.14 = 352.02, plus 18% on the 280 hallmark = 50.40.
  expect(r.gstAmount).toBe(402.42);
  expect([r.cgst, r.sgst]).toEqual([201.21, 201.21]);
  expect(r.salePrice).toBe(8000);
});

test('totals add items, weights and round the grand total', () => {
  const t = calcInvoiceTotals([lurbaItem1, { ...lurbaItem1, igst: true }]);
  expect(t.taxable).toBe(1734.14);
  expect(t.igst).toBe(51.21);
  expect(t.netWeight).toBe(0.948);
  expect(t.stoneCt).toBe(0.88);
  expect(t.grandTotal).toBe(1837);
});

test('GST is charged on the whole amount, and the hallmark carries 18% on top', () => {
  // The ring from the screenshot: metal 61,000 + stone 11,000 + labour 500 + hallmark 70 = 72,570 per piece.
  const c = calcInvoiceItem({
    qty: '1', netWeight: '0.5', metalRate: '122000', labourRate: '1000', hallmark: '70', gstPercent: '3',
    stones: [{ pricing: 'perCt', pcs: '1', weight: '2', rate: '5500' }],
  });
  expect(c.costPerPiece).toBe(72570);
  expect(c.goodsGst).toBe(2177.1);
  expect(c.hallmarkGst).toBe(12.6);
  expect(c.grossAmount).toBe(74759.7);
  expect(priceWithGst(72570, 70, 3)).toBe(74759.7);
  // Lurba line 1: 867.07 × 3% = 26.01, plus 140 × 18% = 25.20.
  expect(calcInvoiceItem({ ...lurbaItem1, labourFixed: true }))
    .toMatchObject({ goodsGst: 26.01, hallmarkGst: 25.2, gstAmount: 51.21, grossAmount: 918.28 });
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

test('fixed labour is the typed amount as it is; the total is metal + labour + hallmark', () => {
  const perGram = { qty: '1', netWeight: '0.474', metalRate: '246.98', labourRate: '500', hallmark: '140' };
  expect(calcInvoiceItem(perGram)).toMatchObject({ metal: 117.07, labour: 237, baseTotal: 494.07 });
  expect(calcInvoiceItem({ ...perGram, labourFixed: true })).toMatchObject({ labour: 500, baseTotal: 757.07 });
  expect(calcInvoiceItem({ ...perGram, labourFixed: true, labourRate: '600' }).labour).toBe(600);
});

test('a diamond row shows carats per piece (Wt ÷ Pcs) and its weight in grams (Wt ÷ 5)', () => {
  expect(diamondCtsPerPiece({ pcs: '10', weight: '0.5' })).toBe(0.05);
  expect(diamondCtsPerPiece({ pcs: '', weight: '0.5' })).toBe(0);
  expect(diamondGrams({ weight: '0.5' })).toBe(0.1);
});

test('gross weight is checked against net + stones + diamonds (carats ÷ 5)', () => {
  // Lurba CLE-1426-F: 1.051 g metal + 1.58 ct of CZ (0.316 g) = 1.367 g gross.
  const item = { grossWeight: '1.367', netWeight: '1.051', stones: [{ weight: '1.58' }], diamonds: [] };
  expect(weightCheck(item)).toMatchObject({ stones: 0.316, diamonds: 0, expected: 1.367, diff: 0, ok: true });
  // A diamond row that is not in the gross weight shows up as 0.020 g missing.
  expect(weightCheck({ ...item, diamonds: [{ weight: '0.1' }] }))
    .toMatchObject({ diamonds: 0.02, expected: 1.387, diff: -0.02, ok: false });
  expect(weightCheck({ grossWeight: '', netWeight: '1.051' })).toBeNull();
});
