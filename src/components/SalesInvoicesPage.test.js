import { fireEvent, render, screen } from '@testing-library/react';
import SalesInvoicesPage from './SalesInvoicesPage';

const sale = (id, orderStatus) => ({
  id, invoiceNo: `SAL-0000${id}`, invoiceDate: '2026-10-17', customerName: 'Riya', salesChannel: 'STORE', paymentStatus: 'PENDING',
  orderStatus, shipping: 0, expenses: 0, roundOff: 0,
  lines: [{ skuNo: 'AV1', qty: 1, netWeight: 2, selling: 3000, gstPercent: 3, igst: false }],
});

test('payment and order status of an open sale are changed from the list', () => {
  const onChangeStatus = jest.fn();
  render(<SalesInvoicesPage sales={[sale(1, 'PROCESSING')]} stock={[]} onNew={() => {}} onEdit={() => {}}
    onDelete={() => {}} onChangeStatus={onChangeStatus} showCost={false} />);

  fireEvent.click(screen.getByRole('button', { name: 'Payment status of SAL-00001' }));
  fireEvent.click(screen.getByRole('option', { name: 'PAID' }));
  expect(onChangeStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { paymentStatus: 'PAID' });

  fireEvent.click(screen.getByRole('button', { name: 'Order status of SAL-00001' }));
  fireEvent.click(screen.getByRole('option', { name: 'SHIPPED' }));
  expect(onChangeStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), { orderStatus: 'SHIPPED' });
});

test('a delivered sale is closed: its statuses are plain badges', () => {
  render(<SalesInvoicesPage sales={[sale(2, 'DELIVERED')]} stock={[]} onNew={() => {}} onEdit={() => {}}
    onDelete={() => {}} onChangeStatus={() => {}} showCost={false} />);
  expect(screen.queryByRole('button', { name: 'Payment status of SAL-00002' })).toBeNull();
  expect(screen.getByText('DELIVERED')).toBeInTheDocument();
});

test('the item view shows the photo and opens the item from its eye button', () => {
  const onViewItem = jest.fn();
  render(<SalesInvoicesPage sales={[sale(3, 'PROCESSING')]} stock={[{ skuNo: 'AV1', category: 'Ring', thumb: '/api/purchase-items/9/photo?v=1' }]}
    onNew={() => {}} onEdit={() => {}} onDelete={() => {}} onViewItem={onViewItem} showCost={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Item View' }));
  expect(screen.getByAltText('AV1')).toHaveAttribute('src', '/api/purchase-items/9/photo?v=1');
  fireEvent.click(screen.getByRole('button', { name: 'View item AV1' }));
  expect(onViewItem).toHaveBeenCalledWith('AV1');
});
