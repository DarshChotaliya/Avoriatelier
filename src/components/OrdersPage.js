import { useMemo, useState } from 'react';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import SelectBox from './SelectBox';
import { formatAmount, money, num } from '../utils/purchaseCalc';
import { ORDER_STATUSES, isOpenOrder } from '../utils/draftOrders';
import './PurchaseInvoices.css';
import './MasterPage.css';
import './Orders.css';

const FILTERS = [
  { key: 'open', label: 'Open', test: isOpenOrder },
  { key: 'ready', label: 'Ready', test: (o) => o.status === 'Ready' },
  { key: 'delivered', label: 'Delivered', test: (o) => o.status === 'Delivered' },
  { key: 'all', label: 'All', test: () => true },
];

const shortDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  : '—');

const statusClass = (s) => `od-status od-${s.toLowerCase().replace(/\s+/g, '-')}`;

function OrdersPage({
  orders, onNew, onEdit, onDelete, onView, onCreateSale, onChangeStatus, salesByOrder, canCreate = true, canDelete = true,
}) {
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const todayIso = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const { test } = FILTERS.find((f) => f.key === filter);
    return orders.filter((o) => test(o) && (!q || [o.orderNo, o.clientName, o.contactNo, o.description, o.designRef,
      o.manufacturer].some((v) => v && v.toLowerCase().includes(q))));
  }, [orders, filter, q]);

  const remove = async (o) => {
    if (await confirmDialog({ title: `Delete order ${o.orderNo}?`, message: `Order for ${o.clientName} will be removed.` })) {
      onDelete(o.id);
    }
  };

  const { pageRows, pager } = usePaged(rows);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Orders</h1>
          <p className="page-subtitle">{orders.filter(isOpenOrder).length} open · {orders.length} total</p>
        </div>
        <div className="pi-top-actions">
          {canCreate && (
            <button type="button" className="pi-btn-gold" onClick={onNew}>
              <Icon name="plusCircle" size={16} />
              New Order
            </button>
          )}
        </div>
      </div>


      <div className="pi-card">
        <div className="pi-filters">
          <label className="pi-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Search client, mobile, design, manufacturer…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="pi-group">
            <span>Show:</span>
            <div className="pi-seg">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" className={filter === f.key ? 'active' : ''}
                  onClick={() => setFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pi-table-wrap">
          <table className="pi-table">
            <thead>
              <tr>
                <th>Order No</th>
                <th>Client</th>
                <th>Piece</th>
                <th>Metal</th>
                <th className="num">Qty</th>
                <th>Manufacturer</th>
                <th>Dates</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th className="center">Invoice</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="pi-empty">
                    {orders.length === 0 ? 'No orders yet. Click “New Order” to add one.' : 'No orders match.'}
                  </td>
                </tr>
              )}
              {pageRows.map((o) => {
                const overdue = isOpenOrder(o) && o.deliveryDate && o.deliveryDate < todayIso;
                return (
                  <tr key={o.id}>
                    <td><span className="pi-sku">{o.orderNo}</span></td>
                    <td>
                      <div className="pi-item-name">{o.clientName}</div>
                      <div className="pi-item-sub">{o.contactNo}</div>
                    </td>
                    <td>
                      <div className="pi-item-name">{o.description}</div>
                      <div className="pi-item-sub">
                        {[o.designRef, o.quotationNo && `from ${o.quotationNo}`].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td>
                      <div className="pi-item-name">{o.metalType || '—'}</div>
                      <div className="od-sub">{o.diamondType || '—'}</div>
                    </td>
                    <td className="num"><span className="pi-qty">{o.qty}</span></td>
                    <td>{o.manufacturer || '—'}</td>
                    <td>
                      {/* Ordered, CAD (once confirmed) and delivery date, one under the other. */}
                      <div className="od-dates">
                        <span><em>Ordered</em>{shortDate(o.clientOrderDate)}</span>
                        {o.cadConfirmedDate && <span><em>CAD</em>{shortDate(o.cadConfirmedDate)}</span>}
                        <span className={overdue ? 'pi-red' : undefined}
                          title={overdue ? 'Delivery date has passed' : undefined}>
                          <em>Delivery</em>{shortDate(o.deliveryDate)}{overdue && ' ⚠'}
                        </span>
                      </div>
                    </td>
                    <td className="od-money">
                      {num(o.amount) > 0 ? (
                        <>
                          <div className="od-amount">₹{formatAmount(o.amount)}</div>
                          {num(o.advance) > 0 ? (
                            <div className="od-split">
                              <span className="od-adv">Advance ₹{formatAmount(o.advance)}</span>
                              <span className="od-bal">Balance ₹{formatAmount(money(num(o.amount) - num(o.advance)))}</span>
                            </div>
                          ) : <div className="od-sub">No advance</div>}
                        </>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {/* The status is changed right here; a delivered order that is already billed is closed. */}
                      {canCreate && onChangeStatus && !(o.status === 'Delivered' && salesByOrder?.get(o.orderNo)) ? (
                        <SelectBox value={o.status} options={ORDER_STATUSES} aria-label={`Status of ${o.orderNo}`}
                          className={`od-pick ${statusClass(o.status)}`} onChange={(status) => onChangeStatus(o, status)} />
                      ) : (
                        <span className={statusClass(o.status)}
                          title={salesByOrder?.get(o.orderNo) ? `Billed on ${salesByOrder.get(o.orderNo)}` : undefined}>
                          {o.status}
                        </span>
                      )}
                      {o.status === 'Delivered' && o.completedDate && (
                        <div className="od-sub">{shortDate(o.completedDate)}</div>
                      )}
                    </td>
                    <td className="center">
                      {/* Delivered orders are billed: the invoice number once made, a button until then. */}
                      {o.status === 'Delivered' && salesByOrder?.get(o.orderNo) && (
                        <span className="od-billed" title="Sales invoice made from this order">
                          {salesByOrder.get(o.orderNo)}
                        </span>
                      )}
                      {o.status === 'Delivered' && !salesByOrder?.get(o.orderNo) && canCreate && onCreateSale && (
                        <button type="button" className="od-bill-btn" title="Make the sales invoice for this order"
                          aria-label={`Make sales invoice for ${o.orderNo}`} onClick={() => onCreateSale(o)}>
                          <Icon name="receipt" size={14} />
                          Invoice
                        </button>
                      )}
                      {o.status !== 'Delivered' && <span className="muted">—</span>}
                    </td>
                    <td className="center">
                      <div className="od-actions">
                        {onView && (
                          <button type="button" className="pi-action" title="View order" aria-label={`View ${o.orderNo}`}
                            onClick={() => onView(o)}>
                            <Icon name="eye" size={15} />
                          </button>
                        )}
                        {canCreate && (
                          <button type="button" className="pi-action" title="Edit" aria-label={`Edit ${o.orderNo}`}
                            onClick={() => onEdit(o)}>
                            <Icon name="edit" size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" className="pi-action danger" title="Delete"
                            aria-label={`Delete ${o.orderNo}`} onClick={() => remove(o)}>
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </div>
    </div>
  );
}

export default OrdersPage;
