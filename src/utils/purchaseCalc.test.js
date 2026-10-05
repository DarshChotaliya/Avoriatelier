import { calcDiamond, calcGold, calcSilver, calcTotals } from './purchaseCalc';

// Same cases as tests/Purchase.Api.Tests/PurchaseCalculatorTests.cs so client and server stay in sync.

test('diamond amount is carat × rate less discount', () => {
  expect(calcDiamond({ carat: '1.5', ratePerCarat: '50000', discountPercent: '10' }).amount).toBe(67500);
});

test('gold uses chargeable weight including wastage', () => {
  const r = calcGold({
    grossWeight: '10', stoneWeight: '0.5', wastagePercent: '2', ratePerGram: '6000',
    makingCharges: '1000', otherCharges: '200',
  });
  expect(r).toEqual({
    netWeight: 9.5, wastageWeight: 0.19, chargeableWeight: 9.69, goldValue: 58140, amount: 59340,
  });
});

test('silver is net weight × rate plus charges', () => {
  const r = calcSilver({ grossWeight: '100', stoneWeight: '5', ratePerGram: '80', makingCharges: '500' });
  expect(r).toEqual({ netWeight: 95, silverValue: 7600, amount: 8100 });
});

test('totals apply discount, GST and round off', () => {
  const r = calcTotals({
    purchaseType: 'Gold',
    discount: '340.33',
    cgstPercent: '1.5',
    sgstPercent: '1.5',
    igstPercent: '',
    goldItems: [{
      grossWeight: '10', stoneWeight: '0.5', wastagePercent: '2', ratePerGram: '6000',
      makingCharges: '1000', otherCharges: '200',
    }],
    diamondItems: [],
    silverItems: [],
  });
  expect(r).toEqual({
    grossAmount: 59340, taxableAmount: 58999.67, cgstAmount: 885, sgstAmount: 885, igstAmount: 0,
    roundOff: 0.33, netPurchaseAmount: 60770,
  });
});
