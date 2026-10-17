// Quotation → Order → Sales Invoice. A quotation the customer accepts becomes an order; once the order is
// Delivered it is billed with a sales invoice (one invoice per order).
import { calcQuoteLine } from './quotationCalc';
import { money, num } from './purchaseCalc';

/** Fields a sale line takes from the order / quotation and keeps when its SKU is picked (stock must not overwrite them). */
export const ORDER_KEEP = ['description', 'metalType', 'qty', 'netWeight', 'metalAmount', 'diaWeight', 'diaAmount',
  'stoneAmount', 'makingCharges', 'selling', 'gstPercent'];

/** "18KT" → "GOLD (18KT)", the way the bill names a metal. */
const metalLabel = (name, metalTypes = []) => {
  const metal = metalTypes.find((m) => m.name === name)?.metal;
  return (metal ? `${metal} (${name})` : name ?? '').toUpperCase();
};

const text = (v) => String(v ?? '').trim();

/**
 * What a new sales invoice starts with when it is made from a delivered order:
 *  - header: customer, branch, order number, payment status (an advance was paid) and a note;
 *  - lines: one per quotation line (design, metal, weight, qty and the priced amounts: metal, diamond, stones, and
 *    making = labour + other + CAD + GST, so the line adds up to the quoted total), or, without a quotation, one line
 *    from the order itself. The SKU is filled when the piece is in stock; otherwise the user picks it.
 */
export function saleFromOrder(order, stock = [], quotation = null, metalTypes = []) {
  const inStock = (sku) => stock.some((s) => s.skuNo === sku && s.available > 0);
  const advance = Number(order.advance) || 0;
  const amount = Number(order.amount) || 0;
  const keep = { orderKeep: ORDER_KEEP };

  let lines;
  if (quotation?.lines?.length) {
    lines = quotation.lines.map((l) => {
      const qty = num(l.qty) || 1;
      const c = calcQuoteLine(l);
      const metal = money(c.metal * qty);
      const diamond = money(c.diamond * qty);
      const stones = money(num(l.stoneAmount) * qty);
      const name = l.isCustom
        ? [l.category, l.size, l.description].filter(Boolean).join(' · ') || 'Custom design'
        : l.description || l.skuNo;
      // A piece from stock in the same metal can be sold straight from stock; anything else is made, then picked.
      const sku = !l.isCustom && l.skuNo && l.fromMetal === l.toMetal && inStock(l.skuNo) ? l.skuNo : '';
      const show = (v) => (v ? String(v) : '');
      return {
        ...keep, skuNo: sku, description: name.toUpperCase().slice(0, 200), metalType: metalLabel(l.toMetal, metalTypes),
        qty: String(qty), netWeight: show(num(l.weight)), metalAmount: show(metal), diaWeight: show(num(l.diamondCt)),
        diaAmount: show(diamond), stoneAmount: show(stones), makingCharges: show(money(c.total - metal - diamond - stones)),
        selling: String(money(c.total / qty)), gstPercent: String(num(l.gstPercent) || 3),
      };
    });
  } else {
    // No quotation: the SKUs the order names that are in stock, or one line from the order's own description.
    const skus = text(order.designRef).split(',').map(text).filter(inStock);
    const qty = Math.max(1, Math.trunc(Number(order.qty)) || 1);
    lines = skus.length
      ? skus.map((sku) => ({ ...keep, skuNo: sku, ...(skus.length === 1 && amount > 0 && { selling: String(amount) }) }))
      : [{
        ...keep, skuNo: '', description: text(order.description).toUpperCase().slice(0, 200),
        metalType: metalLabel(order.metalType, metalTypes), qty: String(qty),
        ...(amount > 0 && { selling: String(money(amount / qty)) }),
      }];
  }

  return {
    header: {
      customerName: order.clientName ?? '',
      contactNo: order.contactNo ?? '',
      branch: order.branch ?? '',
      orderNo: order.orderNo,
      paymentStatus: advance > 0 ? (amount > 0 && advance >= amount ? 'PAID' : 'PARTIAL') : '',
      notes: [`Order ${order.orderNo}`, order.quotationNo && `Quotation ${order.quotationNo}`,
        advance > 0 && `Advance paid Rs ${advance}`].filter(Boolean).join(' · '),
    },
    lines,
  };
}
