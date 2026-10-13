import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseInvoiceModal, {
  invoiceToForm, isInterState, toInvoicePayload, validateInvoice,
} from './PurchaseInvoiceModal';
import { emptyInvoiceItem, emptyStoneRow } from '../constants/purchaseOptions';

const header = { purchaseDate: '2026-10-05', branch: 'SURAT', supplierName: 'LURBA LUXURRY PVT LTD' };
const settings = { labourRatePerGram: 500, labourMinimum: 500, hallmarkCharge: 140, defaultGstPercent: 3 };
const filled = {
  ...emptyInvoiceItem(settings), qty: '1', labourRate: '500', labourMinimum: '500', hallmark: '140', category: 'Earring', designCode: 'CLE-0314-B', diamondType: 'AD',
  metalType: 'S925', grossWeight: '0.562', netWeight: '0.474', metalRate: '246.98',
  stones: [{ stoneType: 'CZ PRN', pricing: 'perCt', pcs: '2', weight: '0.44', rate: '250' }],
};

test('new items start with qty, labour, minimum and hallmark empty; only GST comes from settings', () => {
  expect(emptyInvoiceItem(settings)).toMatchObject({
    qty: '', labourRate: '', labourMinimum: '', hallmark: '', gstPercent: '3',
  });
});

test('empty supplier and required item fields are flagged', () => {
  const r = validateInvoice({ ...header, supplierName: '  ' }, [emptyInvoiceItem(settings)]);
  expect(r.header).toEqual({ supplierName: true });
  expect(r.items[0]).toEqual({ category: true, diamondType: true, metalType: true, netWeight: true, qty: true });
});

test('a filled packing-list item has no errors', () => {
  expect(validateInvoice(header, [filled]).count).toBe(0);
});

test('stone rows need a stone and a weight or piece count; net above gross is flagged', () => {
  const r = validateInvoice(header, [{ ...filled, netWeight: '0.6', stones: [emptyStoneRow()] }]);
  expect(r.items[0]).toEqual({ netWeight: true, stone0: true });
});

test('payload carries the SKU prefix and cost per piece', () => {
  const [line] = toInvoicePayload(header, [filled], [{ name: 'AD', skuPrefix: 'AD-' }]).items;
  expect(line).toMatchObject({
    designCode: 'CLE-0314-B', skuPrefix: 'AD-', metalType: 'S925', qty: 1, price: 867.07, collection: null,
    stones: [{ stoneType: 'CZ PRN', pricing: 'perCt', pcs: 2, weight: 0.44, rate: 250 }],
  });
});

test('a saved invoice opens in the form and saves back with the same item ids', () => {
  const saved = {
    id: 'inv1', purchaseDate: '2026-10-05', branch: 'SURAT', supplierName: 'LURBA LUXURRY PVT LTD',
    items: [{ ...toInvoicePayload(header, [filled]).items[0], id: 'item1', skuNo: 'AD-00001', thumb: 'data:x' }],
  };
  const { header: h, items } = invoiceToForm(saved, settings);
  expect(h.supplierName).toBe('LURBA LUXURRY PVT LTD');
  expect(items[0]).toMatchObject({
    id: 'item1', skuNo: 'AD-00001', thumb: 'data:x', netWeight: '0.474', qty: '1',
    stones: [{ stoneType: 'CZ PRN', pricing: 'perCt', pcs: '2', weight: '0.44', rate: '250' }],
  });
  expect(validateInvoice(h, items).count).toBe(0);
  expect(toInvoicePayload(h, items).items[0]).toMatchObject({ id: 'item1', price: 867.07 });
});

test('IGST is decided per invoice: by supplier state, and old per-item IGST carries over', () => {
  expect(isInterState('Maharashtra', 'Gujarat')).toBe(true);
  expect(isInterState(' gujarat ', 'Gujarat')).toBe(false);
  expect(isInterState('', 'Gujarat')).toBe(false);

  const saved = {
    purchaseDate: '2026-10-05', supplierName: 'X',
    items: [{ ...toInvoicePayload(header, [filled]).items[0], igst: false }, { ...filled, igst: true, stones: [] }],
  };
  const { header: h, items } = invoiceToForm(saved, settings);
  expect(h.igst).toBe(true);
  expect(items.every((i) => i.igst)).toBe(true);
});

test('Add Item saves the items typed so far, then opens a new one at the top', async () => {
  const masters = { branches: [{ name: 'SURAT' }], suppliers: [], categories: [{ name: 'Earring' }], collections: [],
    metalTypes: [{ name: 'S925' }], diamondTypes: [{ name: 'AD' }], stoneTypes: [], stoneNames: [], diamondShapes: [] };
  const stored = { id: 7, purchaseDate: '2026-10-05', branch: 'SURAT', supplierName: 'LURBA', igst: false,
    items: [{ id: 1, skuNo: 'AVEA00001', category: 'Earring', diamondType: 'AD', metalType: 'S925', qty: 1,
      grossWeight: 0.562, netWeight: 0.474, metalRate: 246.98, labourRate: 500, hallmark: 140, gstPercent: 3,
      stones: [], diamonds: [] }] };
  const onSaveDraft = jest.fn().mockResolvedValue(stored);
  const onSubmit = jest.fn().mockResolvedValue();
  render(<PurchaseInvoiceModal masters={masters} settings={settings} invoice={stored} onSaveDraft={onSaveDraft}
    onSubmit={onSubmit} onClose={() => {}} />);

  await userEvent.click(screen.getByRole('button', { name: /add item/i }));
  expect(await screen.findByText('1 item saved')).toBeInTheDocument();
  // Saved as the existing invoice (id 7) with its one item; the new blank item is first, the saved one below it.
  expect(onSaveDraft).toHaveBeenCalledTimes(1);
  expect(onSaveDraft.mock.calls[0][0].items).toHaveLength(1);
  expect(onSaveDraft.mock.calls[0][2]).toBe(7);
  const titles = screen.getAllByText(/^(New Item|Earring)$/, { selector: 'strong' }).map((el) => el.textContent);
  expect(titles).toEqual(['New Item', 'Earring']);

  // The blank item is not complete, so a second Add Item saves nothing and points at the fields.
  await userEvent.click(screen.getByRole('button', { name: /add item/i }));
  expect(onSaveDraft).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Complete the highlighted fields first/)).toBeInTheDocument();
});

test('a saved item opens with the fixed-labour tick as it was saved (off stays off)', () => {
  const saved = (labourFixed) => ({ purchaseDate: '2026-10-05', branch: 'SURAT', supplierName: 'LURBA', igst: false,
    items: [{ id: 1, skuNo: 'AVKD00004', category: 'Kada', diamondType: 'AD', metalType: 'S925', qty: 1, netWeight: 12.277,
      labourRate: 500, labourFixed, stones: [], diamonds: [] }] });
  const off = invoiceToForm(saved(false), settings).items[0];
  expect(off.labourFixed).toBe(false);
  expect(toInvoicePayload(header, [off]).items[0].labourFixed).toBe(false);
  expect(invoiceToForm(saved(true), settings).items[0].labourFixed).toBe(true);
});
