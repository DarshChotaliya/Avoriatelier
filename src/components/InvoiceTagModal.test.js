import { fireEvent, render, screen, within } from '@testing-library/react';
import InvoiceTagModal, { genderOf } from './InvoiceTagModal';

const items = [
  { skuNo: 'AVRNGW00001', category: 'RING', collection: 'Women', netWeight: 3.2 },
  { skuNo: 'AVRNGM00002', category: 'RING', collection: 'Men', netWeight: 6.1 },
  { skuNo: 'AVERW00003', category: 'EARRING', collection: 'Women', netWeight: 1.4 },
  { skuNo: 'AVBRK00004', category: 'BRACELET', collection: 'Kids', netWeight: 2.2 },
  { skuNo: 'AVBRW00005', category: 'BRACELET', collection: 'Women', netWeight: 5.0 },
];

const open = (onPrint = jest.fn(), onClose = jest.fn()) => {
  render(<InvoiceTagModal invoiceNo="LB/26-27/353" items={items} onPrint={onPrint} onClose={onClose} />);
  return { onPrint, onClose };
};

test('gender comes from the collection, else from the letter before the SKU counter', () => {
  expect(genderOf({ collection: 'Women' })).toBe('W');
  expect(genderOf({ collection: 'Men' })).toBe('M');
  expect(genderOf({ collection: 'Kids' })).toBe('K');
  expect(genderOf({ collection: 'UNISEX' })).toBe('U');
  expect(genderOf({ skuNo: 'AVRNGM00002' })).toBe('M');
});

test('"All tags" prints every SKU of the invoice and closes', () => {
  const { onPrint, onClose } = open();
  expect(screen.getByText('5 SKUs · 5 tags')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /All tags/ }));
  expect(onPrint).toHaveBeenCalledWith(items);
  expect(onClose).toHaveBeenCalled();
});

test('Custom filters by gender and by category and prints only the ticked SKUs', () => {
  const { onPrint } = open();
  fireEvent.click(screen.getByRole('button', { name: /Custom/ }));

  // gender: Women / Men / Kids chips with their counts
  expect(screen.getByRole('button', { name: /Women\s*3/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Men\s*1/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Kids\s*1/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Women\s*3/ }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);

  // category on top of the gender: Women + BRACELET is one piece
  fireEvent.click(screen.getByRole('button', { name: /BRACELET\s*2/ }));
  const rows = screen.getAllByRole('checkbox');
  expect(rows).toHaveLength(1);
  expect(within(rows[0]).getByText('AVBRW00005')).toBeInTheDocument();

  // nothing ticked yet: the button cannot print
  expect(screen.getByRole('button', { name: 'Select SKUs' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Select all/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Print 1 tag' }));
  expect(onPrint).toHaveBeenCalledWith([items[4]]);
});

test('Shift+click ticks every SKU between two rows', () => {
  const { onPrint } = open();
  fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
  const rows = () => screen.getAllByRole('checkbox');
  fireEvent.click(rows()[0]);
  fireEvent.click(rows()[3], { shiftKey: true });
  fireEvent.click(screen.getByRole('button', { name: 'Print 4 tags' }));
  expect(onPrint).toHaveBeenCalledWith(items.slice(0, 4));
});

test('search narrows the list and Back returns to the first question', () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
  fireEvent.change(screen.getByPlaceholderText('Search SKU or item…'), { target: { value: 'earring' } });
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /Back/ }));
  expect(screen.getByRole('button', { name: /All tags/ })).toBeInTheDocument();
});
