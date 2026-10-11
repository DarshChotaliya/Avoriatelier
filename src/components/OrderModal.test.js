import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderModal from './OrderModal';

const masters = {
  branches: [{ id: 1, name: 'SURAT' }], customers: [], suppliers: [{ id: 1, name: 'NEEVA' }],
  metalTypes: [{ id: 1, name: '18KT' }], diamondTypes: [{ id: 1, name: 'Lab Grown' }],
};

test('an order from a quotation shows where it came from and saves with the agreed amount', async () => {
  const onSave = jest.fn().mockResolvedValue();
  render(<OrderModal masters={masters} onSave={onSave} onClose={() => {}}
    initial={{ clientName: 'Kamlesh', description: 'Ring', designRef: 'AD-00001', metalType: '18KT',
      quotationNo: 'QT-00001', amount: 125660 }} />);

  expect(screen.getByText(/From quotation/)).toHaveTextContent('QT-00001 · agreed amount ₹1,25,660.00');
  fireEvent.click(screen.getByRole('button', { name: 'Manufacturer' }));
  fireEvent.click(screen.getByRole('option', { name: 'NEEVA' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create Order' }));

  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    clientName: 'Kamlesh', branch: 'SURAT', manufacturer: 'NEEVA', metalType: '18KT', qty: 1,
    quotationNo: 'QT-00001', amount: 125660, orderPlacedDate: null,
  })));
});

test('missing client and description are highlighted instead of saving', () => {
  const onSave = jest.fn();
  render(<OrderModal masters={masters} onSave={onSave} onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Order' }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText('Please fix the 2 highlighted field(s).')).toBeInTheDocument();
});
