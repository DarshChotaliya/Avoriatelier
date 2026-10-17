import { fireEvent, render, screen, within } from '@testing-library/react';
import SalesInvoiceModal, { toSalePayload, validateSale } from './SalesInvoiceModal';

const header = { invoiceDate: '2026-10-05', branch: 'SURAT', customerName: 'Riya Shah', contactNo: '' };
const stock = new Map([['GEM-00001', { skuNo: 'GEM-00001', available: 2 }]]);
const line = (overrides) => ({
  skuNo: 'GEM-00001', qty: '1', netWeight: '2', mrp: '3000', discount: '0', selling: '3000', gstPercent: '3',
  igst: false, ...overrides,
});

test('a valid sale has no errors', () => {
  expect(validateSale(header, [line()], stock).count).toBe(0);
});

test('missing customer, unknown SKU and zero selling price are flagged', () => {
  const r = validateSale({ ...header, customerName: '' }, [line({ skuNo: 'XX-1', selling: '0' })], stock);
  expect(r.header).toEqual({ customerName: true });
  expect(r.lines[0]).toEqual({ skuNo: true, selling: true });
});

test('the same SKU on two lines cannot exceed its stock', () => {
  const r = validateSale(header, [line({ qty: '1' }), line({ qty: '2' })], stock);
  expect(r.lines[0].qty).toBe(true);
  expect(r.lines[1].qty).toBe(true);
});

test('shipping address copies billing when "same as billing" is ticked', () => {
  const p = toSalePayload(
    { ...header, shipping: '50', billingAddress: 'Surat', shippingAddress: 'old', shippingSameAsBilling: true },
    [line()],
  );
  expect(p.shippingAddress).toBe('Surat');
  expect(p.shipping).toBe(50);
  expect(p.lines[0]).toMatchObject({ skuNo: 'GEM-00001', qty: 1, selling: 3000 });
});

test('"New customer" saves the customer and fills contact, city, state and address on the sale', async () => {
  const onAddCustomer = jest.fn().mockResolvedValue();
  render(<SalesInvoiceModal invoiceNo="SAL-00003" stock={[]} customers={[]} branches={[{ name: 'SURAT' }]}
    onSubmit={jest.fn()} onClose={() => {}} onAddCustomer={onAddCustomer} />);

  fireEvent.click(screen.getByRole('button', { name: 'New customer' }));
  const form = screen.getByRole('dialog', { name: 'New Customer' });
  const [name, contact, city] = within(form).getAllByRole('textbox');
  fireEvent.change(name, { target: { value: 'Riya Shah' } });
  fireEvent.change(contact, { target: { value: '9876543210' } });
  fireEvent.change(city, { target: { value: 'Surat' } });
  fireEvent.click(within(form).getByRole('button', { name: /save/i }));

  expect(await screen.findByDisplayValue('Riya Shah')).toBeInTheDocument();
  expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Surat')).toBeInTheDocument();
  expect(onAddCustomer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Riya Shah', city: 'Surat' }));
});

test('a saved sale opens for editing and its own pieces count as available', async () => {
  const onSubmit = jest.fn().mockResolvedValue();
  const invoice = {
    id: 7, invoiceNo: 'SAL-00002', invoiceDate: '2026-10-06', branch: 'SURAT', customerName: 'CD', contactNo: null,
    salesChannel: 'STORE', paymentMethod: 'CASH', paymentStatus: 'PENDING', orderStatus: 'PROCESSING', shipping: 0,
    expenses: 0, roundOff: -1, shippingSameAsBilling: true, billingAddress: 'Rajkot',
    lines: [{ skuNo: 'GEM-00001', qty: 2, netWeight: 2, selling: 3000, gstPercent: 3, igst: false, metalAmount: 6000 }],
  };
  // Stock shows 0 left because this sale took both pieces.
  render(<SalesInvoiceModal invoice={invoice} invoiceNo="SAL-00002" customers={[]} branches={[{ name: 'SURAT' }]}
    stock={[{ skuNo: 'GEM-00001', category: 'Ring', available: 0 }]} onSubmit={onSubmit} onClose={() => {}} />);

  expect(screen.getByRole('dialog', { name: 'Edit Sales Invoice SAL-00002' })).toBeInTheDocument();
  expect(screen.getByDisplayValue('CD')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await screen.findByRole('button', { name: /Saving|Save Changes/ });
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    customerName: 'CD', roundOff: -1, lines: [expect.objectContaining({ skuNo: 'GEM-00001', qty: 2 })],
  }));
});

test('a sale made from a delivered order starts with its customer, order number, piece and agreed amount', async () => {
  const onSubmit = jest.fn().mockResolvedValue();
  const initial = {
    header: { customerName: 'Riya Shah', contactNo: '9876543210', branch: 'SURAT', orderNo: 'ORD-00007',
      notes: 'Order ORD-00007 · Advance paid Rs 5000' },
    lines: [{ skuNo: 'AVRNGW00001', description: 'CQ SET', metalType: 'GOLD (18KT)', qty: '1', netWeight: '3',
      metalAmount: '18000', makingCharges: '24000', selling: '42000', gstPercent: '3',
      orderKeep: ['description', 'metalType', 'qty', 'netWeight', 'metalAmount', 'makingCharges', 'selling', 'gstPercent'] }],
  };
  const stock = [{ skuNo: 'AVRNGW00001', category: 'Ring', collection: 'Women', netWeight: 3.2, mrp: 0, discount: 0,
    salePrice: 0, gstPercent: 3, metalType: 'S925', available: 1 }];
  render(<SalesInvoiceModal initial={initial} invoiceNo="SAL-00005" stock={stock} customers={[]}
    branches={[{ name: 'SURAT' }]} onSubmit={onSubmit} onClose={() => {}} />);

  expect(screen.getByRole('dialog', { name: 'New Sales Invoice' })).toBeInTheDocument();
  expect(screen.getByText('from order ORD-00007')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Riya Shah')).toBeInTheDocument();
  expect(screen.getByDisplayValue('AVRNGW00001')).toBeInTheDocument();
  // The agreed values stay (not the stock's 0 price and its own description).
  expect(screen.getByDisplayValue('CQ SET')).toBeInTheDocument();
  expect(screen.getByDisplayValue('GOLD (18KT)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Create|Save/ }));
  await screen.findByRole('button', { name: /Saving|Create|Save/ });
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    customerName: 'Riya Shah', orderNo: 'ORD-00007',
    lines: [expect.objectContaining({ skuNo: 'AVRNGW00001', selling: 42000, metalAmount: 18000, makingCharges: 24000, netWeight: 3 })],
  }));
});
