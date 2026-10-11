import { fireEvent, render, screen, within } from '@testing-library/react';
import QuotationModal, { toQuotationPayload, validateQuotation } from './QuotationModal';

const stock = [{ skuNo: 'AD-00001', category: 'Ring', metalType: 'S925', netWeight: 10 }];
const metalTypes = [
  { name: 'S925', weightFactor: 1, rate: 250, quoteRate: 300 },
  // The purchase rate (rate) must not be used on a quotation.
  { name: '18KT', weightFactor: 1.5, rate: 6500, quoteRate: 7000 },
];

test('picking a silver design and 18KT converts the weight and fills the gold rate', async () => {
  const onSubmit = jest.fn().mockResolvedValue();
  render(<QuotationModal stock={stock} customers={[]} branches={[{ name: 'SURAT' }]} metalTypes={metalTypes}
    onSubmit={onSubmit} onClose={() => {}} />);

  const row = screen.getByRole('region', { name: 'Design 1' });
  fireEvent.change(within(row).getByPlaceholderText('Type SKU…'), { target: { value: 'AD-00001' } });
  expect(row).toHaveTextContent('S925 · 10 g');

  fireEvent.click(within(row).getByRole('button', { name: 'Quote in metal' }));
  fireEvent.click(screen.getByRole('option', { name: '18KT' }));
  const [weight, rate] = within(row).getAllByRole('spinbutton');
  expect(weight).toHaveValue(15);
  expect(rate).toHaveValue(7000);

  fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'Kamlesh' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Quotation' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    customerName: 'Kamlesh',
    lines: [expect.objectContaining({ skuNo: 'AD-00001', fromMetal: 'S925', toMetal: '18KT', weight: 15, metalRate: 7000 })],
  }));
});

test('a quotation needs a known SKU, a target metal and a weight', () => {
  const header = { quotationDate: '2026-10-06', branch: 'SURAT', customerName: 'Riya', contactNo: '' };
  const r = validateQuotation(header, [{ skuNo: 'XX', toMetal: '', weight: '', qty: '1' }],
    new Map([['AD-00001', stock[0]]]));
  expect(r.lines[0]).toEqual({ skuNo: true, toMetal: true, weight: true });
  expect(toQuotationPayload(header, [{ skuNo: 'AD-00001', qty: '', weight: '15' }]).lines[0].qty).toBe(1);
});

test('"New customer" saves to the Customers master and picks them on the quotation', async () => {
  const onAddCustomer = jest.fn().mockResolvedValue();
  render(<QuotationModal stock={stock} customers={[]} branches={[{ name: 'SURAT' }]} metalTypes={metalTypes}
    onSubmit={jest.fn()} onClose={() => {}} onAddCustomer={onAddCustomer} />);

  fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'Riya Shah' } });
  fireEvent.click(screen.getByRole('button', { name: 'New customer' }));
  const form = screen.getByRole('dialog', { name: 'New Customer' });
  expect(within(form).getByDisplayValue('Riya Shah')).toBeInTheDocument();
  fireEvent.click(within(form).getByRole('button', { name: /save/i }));

  expect(await screen.findByDisplayValue('Riya Shah')).toBeInTheDocument();
  expect(onAddCustomer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Riya Shah' }));
  expect(screen.queryByRole('dialog', { name: 'New Customer' })).not.toBeInTheDocument();
});

test('without permission to add customers there is no "New customer" button', () => {
  render(<QuotationModal stock={stock} customers={[]} branches={[{ name: 'SURAT' }]} metalTypes={metalTypes}
    onSubmit={jest.fn()} onClose={() => {}} />);
  expect(screen.queryByRole('button', { name: 'New customer' })).not.toBeInTheDocument();
});

test('a custom design needs no SKU, only a category (or description), metal and estimated weight', async () => {
  const onSubmit = jest.fn().mockResolvedValue();
  render(<QuotationModal stock={stock} customers={[]} branches={[{ name: 'SURAT' }]} metalTypes={metalTypes}
    categories={[{ id: 1, name: 'Ring' }]} startCustom onSubmit={onSubmit} onClose={() => {}} />);

  const row = screen.getByRole('region', { name: 'Design 1' });
  expect(within(row).queryByPlaceholderText('Type SKU…')).not.toBeInTheDocument();

  fireEvent.click(within(row).getByRole('button', { name: 'Category' }));
  fireEvent.click(screen.getByRole('option', { name: 'Ring' }));
  fireEvent.change(within(row).getByPlaceholderText('e.g. 13'), { target: { value: '13' } });
  fireEvent.click(within(row).getByRole('button', { name: 'Quote in metal' }));
  fireEvent.click(screen.getByRole('option', { name: '18KT' }));
  fireEvent.change(within(row).getAllByRole('spinbutton')[0], { target: { value: '6' } });
  fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'Riya' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Quotation' }));

  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    lines: [expect.objectContaining({ isCustom: true, skuNo: '', category: 'Ring', size: '13', toMetal: '18KT', weight: 6 })],
  }));
});

test('a saved quotation opens for editing (custom and stock designs)', () => {
  const quotation = {
    quotationNo: 'QT-00002', quotationDate: '2026-10-08', branch: 'SURAT', customerName: 'YTFTGF', status: 'Open',
    advance: 0, lines: [
      { isCustom: true, category: 'Earring', toMetal: '18KT', weight: 10, metalRate: 7000, qty: 1, gstPercent: 3 },
      { isCustom: false, skuNo: 'AD-00001', fromMetal: 'S925', fromWeight: 10, toMetal: '18KT', weight: 15, qty: 1 },
    ],
  };
  render(<QuotationModal quotation={quotation} stock={stock} branches={[{ name: 'SURAT' }]} metalTypes={metalTypes}
    onSubmit={jest.fn()} onClose={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Edit Quotation QT-00002' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Design 1' })).toHaveTextContent('Earring');
  expect(within(screen.getByRole('region', { name: 'Design 2' })).getByDisplayValue('AD-00001')).toBeInTheDocument();
});
