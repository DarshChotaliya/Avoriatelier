import { prefixCounters, skuSequence } from './skuRegistry';

// Renaming SKUs is checked on the server (tests/Purchase.Api.Tests/ErpTests.cs).

test('sequence is the trailing number', () => {
  expect([skuSequence('LG-00007'), skuSequence('CQNKW00348'), skuSequence('ABC')]).toEqual([7, 348, 0]);
});

test('counters per diamond-type prefix', () => {
  const types = [{ name: 'AD', skuPrefix: 'AD-' }, { name: 'Lab Grown', skuPrefix: 'LG-' }];
  const [ad, lg] = prefixCounters(types, ['AD-00001', 'AD-00004', 'LG-00002']);
  expect(ad).toMatchObject({ count: 2, last: 4, next: 'AD-00005' });
  expect(lg).toMatchObject({ count: 1, last: 2, next: 'LG-00003' });
});
