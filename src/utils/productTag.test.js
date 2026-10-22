import { metalLabel, metalShort, productUrl, qrSvg, skuFromPath, tagOrigin, tagQrText } from './productTag';

test('a tag links to the piece page and the page reads the SKU back', () => {
  expect(productUrl('AD-00001', 'https://erp.avoriatelier.com')).toBe('https://erp.avoriatelier.com/p/AD-00001');
  expect(skuFromPath('/p/AD-00001')).toBe('AD-00001');
  expect(skuFromPath('/purchases')).toBeNull();
});

test('the QR is an SVG and the metal line reads like the tag', () => {
  expect(qrSvg('https://erp/p/AD-00001')).toMatch(/^<svg[^>]+viewBox="0 0 \d+ \d+"/);
  // 2 white modules all round, so a scanner finds the edges of the code on a crowded label.
  expect(qrSvg("https://erp/p/AD-00001")).toContain('translate(2 2)');
  expect(metalLabel('S925')).toBe('925 STERLING SILVER');
  expect(metalLabel('18KT', [{ name: '18KT', metal: 'Gold' }])).toBe('18KT GOLD');
});

test('flag tags use a short metal mark', () => {
  expect(['S925', '14KT', '18KT', '22K', '9KT'].map(metalShort)).toEqual(['925', '14K', '18K', '22K', '9K']);
});

test('a tag printed from a private address points at the public site, a public site at itself', () => {
  const at = (hostname, origin = `https://${hostname}`) => tagOrigin({ hostname, origin });
  expect(at('localhost', 'http://localhost:3000')).toBe('https://erp.avoriatelier.com');
  expect(at('127.0.0.1', 'http://127.0.0.1:3000')).toBe('https://erp.avoriatelier.com');
  expect(at('192.168.1.20', 'http://192.168.1.20:3000')).toBe('https://erp.avoriatelier.com');
  expect(at('172.20.0.5', 'http://172.20.0.5')).toBe('https://erp.avoriatelier.com');
  expect(at('erp.avoriatelier.com')).toBe('https://erp.avoriatelier.com');
  expect(at('shop.example.com')).toBe('https://shop.example.com');
});

test('a tag QR holds the capital-letter address, which fits the small 25 x 25 QR version', () => {
  const text = tagQrText('AVBR7W00040', 'https://erp.avoriatelier.com');
  expect(text).toBe('HTTPS://ERP.AVORIATELIER.COM/P/AVBR7W00040');
  expect(qrSvg(text)).toMatch(/viewBox="0 0 29 29"/); // 25 modules + 2 quiet modules each side
  expect(skuFromPath('/P/AVBR7W00040')).toBe('AVBR7W00040');
});
