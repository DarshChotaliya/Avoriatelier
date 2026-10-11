import { MASTER_KEYS, loadMasters, loadSettings, saveSettings } from './masters';
import { orderFromQuotation } from './draftOrders';
import { toOrderPayload, validateOrder } from '../components/OrderModal';
import { mastersApi } from '../api/erpApi';

beforeEach(() => localStorage.clear());

// Seeding, unique names and "in use" protection run on the server (tests/Purchase.Api.Tests/ErpTests.cs).
jest.mock('../api/erpApi', () => ({ mastersApi: { all: jest.fn() } }));

test('masters load every kind, empty when the server has none', async () => {
  mastersApi.all.mockResolvedValue({ diamondTypes: [{ id: 1, name: 'AD', skuPrefix: 'AD-' }] });
  const m = await loadMasters();
  expect(Object.keys(m)).toEqual(MASTER_KEYS);
  expect(m.diamondTypes[0].skuPrefix).toBe('AD-');
  expect(m.customers).toEqual([]);
});

test('settings fall back to defaults and save', () => {
  expect(loadSettings().labourMinimum).toBe(500);
  saveSettings({ ...loadSettings(), hallmarkCharge: 140 });
  expect(loadSettings().hallmarkCharge).toBe(140);
});

test('an accepted quotation pre-fills the order; empty dates go to the API as null', () => {
  const order = orderFromQuotation({
    quotationNo: 'QT-00001', customerName: 'Kamlesh', contactNo: '7874607111', branch: 'SURAT', grandTotal: 125660,
    notes: null, lines: [{ skuNo: 'AD-00001', description: 'Ring', toMetal: '18KT', qty: 1 }],
  });
  expect(order).toMatchObject({
    clientName: 'Kamlesh', description: 'Ring', designRef: 'AD-00001', metalType: '18KT', qty: '1',
    quotationNo: 'QT-00001', amount: 125660,
  });
  const payload = toOrderPayload({ ...order, clientOrderDate: '2026-10-06', orderPlacedDate: '', completedDate: '' });
  expect(payload).toMatchObject({ qty: 1, orderPlacedDate: null, completedDate: null });
});

test('order dates must follow the flow', () => {
  const base = {
    clientName: 'K', description: 'CQ SET', clientOrderDate: '2026-07-27', qty: '1', contactNo: '',
    orderPlacedDate: '2026-07-28', cadConfirmedDate: '2026-07-20', deliveryDate: '',
  };
  expect(validateOrder(base)).toEqual({ cadConfirmedDate: 'Before an earlier step' });
});
