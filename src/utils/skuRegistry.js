// SKU numbering: PREFIX + 5-digit running number per prefix (e.g. LG-00007).
import { nextNumber } from './browserStore';

/** Running number at the end of a SKU, e.g. 'LG-00007' → 7 (0 if there is none). */
export const skuSequence = (sku) => parseInt(String(sku).match(/(\d+)$/)?.[1] ?? '0', 10);

/** Counter state per diamond-type prefix: last used number and the next SKU it will give out. */
export function prefixCounters(diamondTypes, skus) {
  return diamondTypes.map((d) => {
    const used = skus.filter((s) => d.skuPrefix && s.startsWith(d.skuPrefix));
    return {
      ...d,
      count: used.length,
      last: used.reduce((m, s) => Math.max(m, skuSequence(s)), 0),
      next: d.skuPrefix ? nextNumber(d.skuPrefix, skus) : '—',
    };
  });
}
