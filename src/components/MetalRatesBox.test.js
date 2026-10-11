import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MetalRatesBox from './MetalRatesBox';
import { metalRatesApi } from '../api/erpApi';

jest.mock('../api/erpApi', () => ({ metalRatesApi: { get: jest.fn(), save: jest.fn() } }));

test("today's gold rate is saved and the master list reloads", async () => {
  metalRatesApi.get.mockResolvedValue([
    { metal: 'Gold', rate: 0 }, { metal: 'Silver', rate: 220 }, { metal: 'Platinum', rate: 0 },
  ]);
  metalRatesApi.save.mockResolvedValue([
    { metal: 'Gold', rate: 14900 }, { metal: 'Silver', rate: 220 }, { metal: 'Platinum', rate: 3200 },
  ]);
  const onSaved = jest.fn().mockResolvedValue();
  render(<MetalRatesBox canEdit onSaved={onSaved} />);

  const gold = screen.getByLabelText(/Gold 999/);
  await waitFor(() => expect(screen.getByLabelText(/Silver 999/)).toHaveValue(220));
  fireEvent.change(gold, { target: { value: '14900' } });
  fireEvent.change(screen.getByLabelText(/Platinum 999/), { target: { value: '3200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Rates' }));

  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(metalRatesApi.save).toHaveBeenCalledWith({ gold: 14900, silver: 220, platinum: 3200 });
  expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
});
