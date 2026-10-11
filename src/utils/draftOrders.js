// Customer orders (made-to-order pieces) are stored in the database through the API
// (see api/Services/OrderService.cs). The server numbers them ORD-00001… and stamps the completion date on delivery.
import { orderApi } from '../api/erpApi';

export const ORDER_STATUSES = ['Pending', 'Order Placed', 'CAD Confirmed', 'In Production', 'Ready', 'Delivered',
  'Cancelled'];

/** Orders that still need work (not delivered or cancelled). */
export const isOpenOrder = (o) => o.status !== 'Delivered' && o.status !== 'Cancelled';

export const loadOrders = () => orderApi.list();

/** Insert (no id) or update (with id). */
export const saveOrder = (order) => orderApi.save(order, order.id);

export const deleteOrder = (id) => orderApi.remove(id);

/** A new order pre-filled from an accepted quotation: client, design(s), metal, qty and the agreed amount. */
export function orderFromQuotation(q) {
  const first = q.lines[0] ?? {};
  const name = (l) => (l.isCustom ? [l.category, l.size, l.description].filter(Boolean).join(' · ') || 'Custom design'
    : l.description || l.skuNo);
  return {
    clientName: q.customerName,
    contactNo: q.contactNo ?? '',
    branch: q.branch,
    description: q.lines.map(name).join(', ').slice(0, 200),
    designRef: q.lines.map((l) => (l.isCustom ? 'CUSTOM' : l.skuNo)).join(', ').slice(0, 50),
    photo: q.lines.find((l) => l.photo)?.photo ?? '',
    advance: q.advance ?? 0,
    metalType: first.toMetal ?? '',
    qty: String(q.lines.reduce((n, l) => n + (l.qty || 1), 0)),
    quotationNo: q.quotationNo,
    amount: q.grandTotal,
    notes: q.notes ?? '',
  };
}
