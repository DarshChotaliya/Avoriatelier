import { saleFromOrder } from './orderFlow';

const stock = [
  { skuNo: 'AVRNGW00001', available: 1 },
  { skuNo: 'AVERW00002', available: 0 },
];
const metalTypes = [{ name: '18KT', metal: 'Gold' }];
const order = {
  orderNo: 'ORD-00007', clientName: 'Riya Shah', contactNo: '9876543210', branch: 'SURAT', quotationNo: 'QT-00003',
  advance: 5000, amount: 42000, qty: 1, description: 'Ring, Pendant', designRef: 'AVRNGW00001, CUSTOM',
};

test('a sale from an order carries the customer, branch, order number, payment status and a note', () => {
  const { header } = saleFromOrder(order, stock);
  expect(header).toEqual({
    customerName: 'Riya Shah', contactNo: '9876543210', branch: 'SURAT', orderNo: 'ORD-00007', paymentStatus: 'PARTIAL',
    notes: 'Order ORD-00007 · Quotation QT-00003 · Advance paid Rs 5000',
  });
  expect(saleFromOrder({ ...order, advance: 42000 }, stock).header.paymentStatus).toBe('PAID');
  expect(saleFromOrder({ ...order, advance: 0, quotationNo: '' }, stock).header.paymentStatus).toBe('');
});

test('the quotation lines become sale lines that add up to the quoted total', () => {
  const quotation = {
    lines: [
      // A custom ring in 18KT: 3 g at 6,000 / g, labour 500 / g, 0.5 ct diamond at 40,000, stones 1,000, CAD 600, GST 3%.
      { isCustom: true, category: 'Ring', size: '13', description: 'Pinterest ring', toMetal: '18KT', fromMetal: '', weight: 3,
        qty: 1, metalRate: 6000, labourType: 'perGram', labourRate: 500, diamondCt: 0.5, diamondRate: 40000,
        stoneAmount: 1000, otherCharges: 0, cadCharge: 600, gstPercent: 3, skuNo: '' },
      // A piece from stock in the same metal: the SKU is filled.
      { isCustom: false, skuNo: 'AVRNGW00001', description: 'Ring', fromMetal: '18KT', toMetal: '18KT', weight: 2, qty: 2,
        metalRate: 5000, labourType: 'perGram', labourRate: 400, diamondCt: 0, diamondRate: 0, stoneAmount: 0,
        otherCharges: 0, cadCharge: 0, gstPercent: 3 },
    ],
  };
  const { lines } = saleFromOrder(order, stock, quotation, metalTypes);
  expect(lines).toHaveLength(2);
  // 18,000 metal + 1,500 labour + 20,000 diamond + 1,000 stones = 40,500 + 600 CAD = 41,100; + 3% GST = 42,333.
  expect(lines[0]).toMatchObject({
    skuNo: '', description: 'RING · 13 · PINTEREST RING', metalType: 'GOLD (18KT)', qty: '1', netWeight: '3',
    metalAmount: '18000', diaWeight: '0.5', diaAmount: '20000', stoneAmount: '1000', makingCharges: '3333', selling: '42333',
  });
  expect(Number(lines[0].metalAmount) + Number(lines[0].diaAmount) + Number(lines[0].stoneAmount)
    + Number(lines[0].makingCharges)).toBe(42333);
  expect(lines[1]).toMatchObject({ skuNo: 'AVRNGW00001', qty: '2', netWeight: '2', metalType: 'GOLD (18KT)' });
  expect(lines[1].orderKeep).toContain('selling');
});

test('without a quotation: the order\'s in-stock SKU, or one line from its own description', () => {
  const one = saleFromOrder({ ...order, quotationNo: '' }, stock).lines;
  expect(one).toHaveLength(1);
  expect(one[0]).toMatchObject({ skuNo: 'AVRNGW00001', selling: '42000' });

  const custom = saleFromOrder({ ...order, quotationNo: '', designRef: 'CUSTOM', qty: 2, metalType: '18KT' }, stock, null,
    metalTypes).lines;
  expect(custom[0]).toMatchObject({ skuNo: '', description: 'RING, PENDANT', metalType: 'GOLD (18KT)', qty: '2', selling: '21000' });
});
