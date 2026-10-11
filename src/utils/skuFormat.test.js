import { buildSku, genderCode, nextSku, sizeCode } from './skuFormat';

const settings = { companyPrefix: 'AV', nameChars: 2, seqDigits: 5, separator: '', counter: 80 };

test('SKU = company + item code + size + gender + running number (same as the server)', () => {
  expect(buildSku(settings, { category: 'Ring', size: '14', collection: 'Women' }, 81)).toBe('AVRI14W00081');
  expect(buildSku(settings, { category: 'Necklace', size: '16 in', collection: 'Men' }, 7)).toBe('AVNE16M00007');
  expect(buildSku(settings, { category: 'Pendant', size: '', collection: 'Heritage' }, 9)).toBe('AVPEU00009');
  expect(buildSku({ ...settings, nameChars: 3, seqDigits: 4, separator: '-' },
    { category: 'Ring', size: '14', collection: 'Women' }, 349)).toBe('AV-RIN-14-W-0349');
  // The category's own short code (Item Categories master) wins over the first letters.
  expect(buildSku(settings, { category: 'Ring', shortCode: 'rg', size: '14', collection: 'Women' }, 81)).toBe('AVRG14W00081');
});

test('size keeps only digits and gender comes from the collection', () => {
  expect(['14', '2-4', '12 × 18 mm', ''].map(sizeCode)).toEqual(['14', '24', '1218', '']);
  expect(['Women', 'Men', 'Kids', 'Bridal', ''].map(genderCode)).toEqual(['W', 'M', 'K', 'U', 'U']);
});

test('the next SKU continues from the counter and skips numbers already in use', () => {
  const item = { category: 'Ring', size: '14', collection: 'Women' };
  expect(nextSku(settings, item, [])).toEqual({ sku: 'AVRI14W00081', sequence: 81 });
  expect(nextSku(settings, item, ['AVRI14W00081']).sku).toBe('AVRI14W00082');
});
