import { savePurchaseInvoice, toItemRows } from './draftInvoices';
import { purchaseInvoiceApi } from '../api/erpApi';

// SKU numbering and the sold-stock rules run on the server (tests/Purchase.Api.Tests/ErpTests.cs).
jest.mock('../api/erpApi', () => ({ purchaseInvoiceApi: { create: jest.fn(), update: jest.fn() } }));

const invoice = {
  id: 7, purchaseDate: '2026-06-20', supplierName: 'Leo Silver', supplierInvoiceNo: 'JS/178', createdAt: 'x',
  items: [{ id: 1, skuNo: 'AD-00001', qty: 2, price: 1200, gstPercent: 3, mrp: 4500, discount: 500 }],
};

test('item rows: purchase with GST, sale, net amount and net %', () => {
  const [row] = toItemRows([invoice]);
  expect(row).toMatchObject({
    skuNo: 'AD-00001', invoiceId: 7, supplierName: 'Leo Silver', purchWithGst: 1236, sale: 4000,
    netAmount: 5528, netPercent: 69.1,
  });
});

test('saving keeps an existing photo and creates or updates by id', async () => {
  purchaseInvoiceApi.create.mockResolvedValue({ id: 8 });
  purchaseInvoiceApi.update.mockResolvedValue({ id: 7 });
  const payload = { supplierName: 'Leo Silver', items: [{ id: 1, thumb: 'data:old' }, { thumb: null }] };

  await savePurchaseInvoice(payload, [null, null]);
  expect(purchaseInvoiceApi.create).toHaveBeenCalledWith({
    supplierName: 'Leo Silver', items: [{ id: 1, thumb: 'data:old' }, { thumb: null }],
  });

  await savePurchaseInvoice(payload, [null, null], 7);
  expect(purchaseInvoiceApi.update).toHaveBeenCalledWith(7, expect.objectContaining({ supplierName: 'Leo Silver' }));
});
