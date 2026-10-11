import { useMemo, useState } from 'react';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import { isOpenOrder } from '../utils/draftOrders';
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

function OrdersPage({ orders, onNew, onEdit, onDelete, canCreate = true, canDelete = true }) {
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
                <th>Diamond</th>
                <th className="num">Qty</th>
                <th>Manufacturer</th>
                <th>Ordered</th>
                <th>CAD</th>
                <th>Delivery</th>
                <th>Status</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="pi-empty">
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
                    <td>{o.metalType || '—'}</td>
                    <td>{o.diamondType || '—'}</td>
                    <td className="num"><span className="pi-qty">{o.qty}</span></td>
                    <td>{o.manufacturer || '—'}</td>
                    <td className="muted">{shortDate(o.clientOrderDate)}</td>
                    <td className="muted">{shortDate(o.cadConfirmedDate)}</td>
                    <td className={overdue ? 'pi-red' : 'muted'} title={overdue ? 'Delivery date has passed' : undefined}>
                      {shortDate(o.deliveryDate)}{overdue && ' ⚠'}
                    </td>
                    <td>
                      <span className={statusClass(o.status)}>{o.status}</span>
                      {o.status === 'Delivered' && o.completedDate && (
                        <div className="pi-item-sub">{shortDate(o.completedDate)}</div>
                      )}
                    </td>
                    <td className="center mp-actions">
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
