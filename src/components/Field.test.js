import { fireEvent, render, screen } from '@testing-library/react';
import Field from './Field';

test('a suggestions list is a styled dropdown that keeps an older value not in the list', () => {
  const onChange = jest.fn();
  render(<Field label="Shape" value="Marquise Old" onChange={onChange} suggestions={['Round', 'Princess']} />);
  const button = screen.getByRole('button', { name: 'Shape' });
  expect(button).toHaveTextContent('Marquise Old');
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('option', { name: 'Princess' }));
  expect(onChange).toHaveBeenCalledWith('Princess');
});
