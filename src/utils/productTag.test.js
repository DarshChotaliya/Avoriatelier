import { metalLabel, metalShort, productUrl, qrSvg, skuFromPath } from './productTag';

test('a tag links to the piece page and the page reads the SKU back', () => {
  expect(productUrl('AD-00001', 'https://erp.avoriatelier.com')).toBe('https://erp.avoriatelier.com/p/AD-00001');
  expect(skuFromPath('/p/AD-00001')).toBe('AD-00001');
  expect(skuFromPath('/purchases')).toBeNull();
});

test('the QR is an SVG and the metal line reads like the tag', () => {
  expect(qrSvg('https://erp/p/AD-00001')).toMatch(/^<svg[^>]+viewBox="0 0 \d+ \d+"/);
  expect(metalLabel('S925')).toBe('925 STERLING SILVER');
  expect(metalLabel('18KT', [{ name: '18KT', metal: 'Gold' }])).toBe('18KT GOLD');
});

test('flag tags use a short metal mark', () => {
  expect(['S925', '14KT', '18KT', '22K', '9KT'].map(metalShort)).toEqual(['925', '14K', '18K', '22K', '9K']);
});
