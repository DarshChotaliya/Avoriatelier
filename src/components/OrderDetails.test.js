import { fireEvent, render, screen } from '@testing-library/react';
import OrderDetails from './OrderDetails';
import OrdersPage from './OrdersPage';

const order = {
  id: 4, orderNo: 'ORD-00004', clientName: 'Riya Shah', contactNo: '9876543210', branch: 'SURAT', description: 'EARRING · 10 × 1 MM',
  designRef: 'CUSTOM', metalType: '14KT', diamondType: 'AD', qty: 1, status: 'Delivered', clientOrderDate: '2026-10-10',
  deliveryDate: '2026-10-20', completedDate: '2026-10-18', quotationNo: 'QT-00002', amount: 42000, advance: 10000, notes: 'Gift wrap',
};
const quotation = {
  quotationNo: 'QT-00002',
  lines: [{ isCustom: true, category: 'Earring', size: '10 × 1 MM', toMetal: '14KT', weight: 3, qty: 1, metalRate: 5000,
    labourType: 'perGram', labourRate: 500, diamondCt: 0, diamondRate: 0, stoneAmount: 0, otherCharges: 0, cadCharge: 0, gstPercent: 3 }],
};

test('the order view shows the customer, dates, amount, advance, balance, quotation lines and notes', () => {
  render(<OrderDetails order={order} quotation={quotation} invoiceNo={null} onEdit={() => {}} onInvoice={() => {}}
    onClose={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'Order ORD-00004' })).toBeInTheDocument();
  expect(screen.getAllByText('Riya Shah').length).toBeGreaterThan(0);
  expect(screen.getByText('₹42,000.00')).toBeInTheDocument();
  expect(screen.getByText('₹10,000.00')).toBeInTheDocument();
  expect(screen.getByText('₹32,000.00')).toBeInTheDocument(); // balance
  expect(screen.getByText(/From quotation QT-00002/)).toBeInTheDocument();
  expect(screen.getByText('Gift wrap')).toBeInTheDocument();
  // 3 g × 5,000 + 3 g × 500 = 16,500 + 3% GST
  expect(screen.getByText('₹16,995.00')).toBeInTheDocument();
  // Delivered and not billed yet: the invoice can be made from here.
  expect(screen.getByRole('button', { name: /Make Sales Invoice/ })).toBeInTheDocument();
});

test('a billed order shows its invoice and no invoice button', () => {
  render(<OrderDetails order={order} invoiceNo="SAL-00001" onEdit={() => {}} onInvoice={() => {}} onClose={() => {}} />);
  expect(screen.getByText('SAL-00001')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Make Sales Invoice/ })).toBeNull();
});

test('the orders list shows the amount with advance and balance, and a view button', () => {
  const onView = jest.fn();
  render(<OrdersPage orders={[{ ...order, status: 'Pending' }]} onNew={() => {}} onEdit={() => {}} onDelete={() => {}}
    onView={onView} onChangeStatus={() => {}} salesByOrder={new Map()} />);
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByText('₹42,000.00')).toBeInTheDocument();
  expect(screen.getByText('Advance ₹10,000.00')).toBeInTheDocument();
  expect(screen.getByText('Balance ₹32,000.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View ORD-00004' }));
  expect(onView).toHaveBeenCalledWith(expect.objectContaining({ orderNo: 'ORD-00004' }));
});
