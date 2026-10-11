import { calcQuoteLine, calcQuoteTotals, convertWeight } from './quotationCalc';

const metalTypes = [
  { name: 'S925', weightFactor: 1 },
  { name: '18KT', weightFactor: 1.5 },
  { name: '22KT', weightFactor: 1.7 },
  { name: 'PT950', weightFactor: 0 },
];

test('converts a design weight between metals in both directions', () => {
  expect(convertWeight(10, 'S925', '18KT', metalTypes)).toBe(15);
  expect(convertWeight(15, '18KT', 'S925', metalTypes)).toBe(10);
  expect(convertWeight(10, '18KT', '22KT', metalTypes)).toBe(11.333);
  // Unknown metal or no factor counts as 1.
  expect(convertWeight(10, 'S925', 'PT950', metalTypes)).toBe(10);
});

test('prices a silver ring quoted in 18KT gold (same figures as the server test)', () => {
  const line = {
    weight: '15', metalRate: '7000', labourType: 'perGram', labourRate: '800', stoneAmount: '5000',
    otherCharges: '', gstPercent: '3', qty: '1',
  };
  expect(calcQuoteLine(line)).toEqual({
    metal: 105000, labour: 12000, diamond: 0, taxable: 122000, gst: 3660, total: 125660,
  });
  expect(calcQuoteLine({ ...line, labourType: 'percent', labourRate: '12' }).labour).toBe(12600);
  expect(calcQuoteTotals([line, { ...line, qty: '2' }]).grandTotal).toBe(376980);
});

test('a custom design adds diamonds per piece and the CAD charge once, and the advance leaves a balance', () => {
  // Same figures as the server test: 6 g 18KT × 2 pieces, 0.5 ct diamonds, CAD 1,500.
  const line = {
    weight: '6', metalRate: '11622', labourType: 'perGram', labourRate: '800', diamondCt: '0.5', diamondRate: '40000',
    cadCharge: '1500', gstPercent: '3', qty: '2',
  };
  expect(calcQuoteLine(line)).toMatchObject({ diamond: 20000, taxable: 190564 });
  expect(calcQuoteTotals([line], '20000')).toMatchObject({ grandTotal: 196281, advance: 20000, balance: 176281 });
});
