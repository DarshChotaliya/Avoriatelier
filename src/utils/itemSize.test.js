import { formatSize, parseSize, sizeKind } from './itemSize';

test('each category gets its own way of measuring', () => {
  expect(['Bracelet', 'Necklace', 'Chain', 'Anklet'].map(sizeKind)).toEqual(['length', 'length', 'length', 'length']);
  expect(['Pendant', 'Earring'].map(sizeKind)).toEqual(['wh', 'wh']);
  expect(sizeKind('Ring')).toBe('ring');
  expect(['Bangle', 'Kada'].map(sizeKind)).toEqual(['bangle', 'bangle']);
  expect(['Set', 'Nose Pin', ''].map(sizeKind)).toEqual(['text', 'text', 'text']);
});

test('sizes are stored as readable text and read back for editing', () => {
  expect(formatSize('length', { length: '16' })).toBe('16 in');
  expect(parseSize('length', '16 in')).toEqual({ length: '16' });
  expect(formatSize('wh', { width: '0.5', height: '0.7' })).toBe('0.5 × 0.7 in');
  expect(parseSize('wh', '0.5 × 0.7 in')).toEqual({ width: '0.5', height: '0.7' });
  expect(parseSize('wh', '12 × 18 mm')).toEqual({ width: '12', height: '18' });
  expect(parseSize('wh', '12*18')).toEqual({ width: '12', height: '18' });
  expect(formatSize('bangle', { value: '2-4' })).toBe('2-4');
  expect(formatSize('length', { length: '' })).toBe('');
});
