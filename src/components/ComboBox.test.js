import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import ComboBox from './ComboBox';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <ComboBox value={value} onChange={setValue} aria-label="SKU" placeholder="Type SKU…"
      options={[{ value: 'AD-00001', label: 'AD-00001', hint: 'Ring' }, { value: 'NAT-00002', label: 'NAT-00002', hint: 'Earring' }]} />
  );
}

test('typing filters the styled list and a click picks the option', () => {
  render(<Harness />);
  const input = screen.getByPlaceholderText('Type SKU…');
  fireEvent.change(input, { target: { value: 'nat' } });
  expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.click(screen.getByRole('option', { name: /NAT-00002/ }));
  expect(input).toHaveValue('NAT-00002');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('free text that matches nothing is kept', () => {
  render(<Harness />);
  const input = screen.getByPlaceholderText('Type SKU…');
  fireEvent.change(input, { target: { value: 'NEW-1' } });
  expect(input).toHaveValue('NEW-1');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
