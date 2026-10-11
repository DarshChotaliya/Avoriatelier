import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { alertDialog, confirmDialog, DialogHost } from './ConfirmDialog';

test('confirmDialog resolves true on Delete and false on Cancel', async () => {
  render(<DialogHost />);

  let result;
  act(() => {
    confirmDialog({ title: 'Delete item NAT-00002?', message: 'It will be removed.' }).then((r) => { result = r; });
  });
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete item NAT-00002?');
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(result).toBe(true));
  expect(screen.queryByRole('alertdialog')).toBeNull();

  act(() => {
    confirmDialog({ message: 'Again?' }).then((r) => { result = r; });
  });
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(result).toBe(false));
});

test('alertDialog shows only an OK button', async () => {
  render(<DialogHost />);
  let closed = false;
  act(() => {
    alertDialog('NAT-00002 is used in a sales invoice.').then(() => { closed = true; });
  });
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  await waitFor(() => expect(closed).toBe(true));
});
