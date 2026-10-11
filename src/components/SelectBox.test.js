import { fireEvent, render, screen } from '@testing-library/react';
import SelectBox from './SelectBox';

const setup = (props = {}) => {
  const onChange = jest.fn();
  render(<SelectBox value="" onChange={onChange} options={['Women', 'Men']} placeholder="— Collection —"
    aria-label="Collection" {...props} />);
  return { onChange, button: screen.getByRole('button', { name: 'Collection' }) };
};

test('shows the placeholder, opens the list and picks an option by mouse', () => {
  const { onChange, button } = setup();
  expect(button).toHaveTextContent('— Collection —');
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('option', { name: 'Men' }));
  expect(onChange).toHaveBeenCalledWith('Men');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

test('keyboard: arrows move, Enter chooses', () => {
  const { onChange, button } = setup({ value: 'Women' });
  fireEvent.keyDown(button, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: 'Women' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(button, { key: 'ArrowDown' });
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('Men');
});

test('Escape closes only the list, not the dialog around it', () => {
  const dialogEscape = jest.fn();
  document.addEventListener('keydown', dialogEscape);
  const { button } = setup();
  fireEvent.click(button);
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(dialogEscape).not.toHaveBeenCalled();
  document.removeEventListener('keydown', dialogEscape);
});

test('allowEmpty adds a clear option', () => {
  const { onChange, button } = setup({ value: 'Men', allowEmpty: true });
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('option', { name: '— Collection —' }));
  expect(onChange).toHaveBeenCalledWith('');
});
