import { rupeesInWords } from './saleBill';
import { calcSaleLine, calcSaleTotals, saleLineAmount } from './salesCalc';

// Invoice AV-00060: AVORI KIDS BRACELET, GOLD (18KT).
const kidsBracelet = {
  skuNo: 'LG-00001', description: 'AVORI KIDS BRACELET', hsnSac: '7113', metalType: 'GOLD (18KT)', qty: '1',
  grossWeight: '5.50', netWeight: '4.53', metalAmount: '52095', diaPcs: '2', diaWeight: '2.45', diaAmount: '49000',
  stonePcs: '0', stoneWeight: '0', stoneAmount: '0', makingCharges: '5436', selling: '106531', gstPercent: '3',
};

test('the bill amount is metal + diamond + stone + making, and the round-off gives the payable amount', () => {
  expect(saleLineAmount(kidsBracelet)).toBe(106531);
  expect(calcSaleLine(kidsBracelet).total).toBe(106531);
  expect(calcSaleTotals([kidsBracelet], 0, '-1').grandTotal).toBe(106530);
  // An older sale without the break-up still totals selling × qty.
  expect(saleLineAmount({ selling: '5150', qty: '2' })).toBe(10300);
});

test('amount in words reads like the invoice', () => {
  expect(rupeesInWords(106530)).toBe('ONE LAKH SIX THOUSAND FIVE HUNDRED AND THIRTY RUPEES');
  expect(rupeesInWords(12500000)).toBe('ONE CRORE TWENTY FIVE LAKH RUPEES');
  expect(rupeesInWords(1001)).toBe('ONE THOUSAND ONE RUPEES');
  expect(rupeesInWords(0)).toBe('ZERO RUPEES');
});
