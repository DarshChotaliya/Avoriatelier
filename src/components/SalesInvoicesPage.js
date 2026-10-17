import { useMemo, useState } from 'react';
import PhotoThumb from './PhotoThumb';
import SelectBox from './SelectBox';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../constants/salesOptions';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import { calcSaleTotals, saleLineAmount } from '../utils/salesCalc';
import { canEditSale, saleProfit } from '../utils/draftSales';
import { printSaleBill } from '../utils/saleBill';
import { formatAmount, num } from '../utils/purchaseCalc';
import './PurchaseInvoices.css';
import './SalesInvoice.css';

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

// A custom sale is one made to order: some line has no stock SKU.
const isCustomSale = (s) => s.lines.some((l) => !l.skuNo);

function SalesInvoicesPage({
  sales, stock, onNew, onEdit, onDelete, onChangeStatus, onViewItem, onViewOrder, canCreate = true, canDelete = true, showCost = true,
}) {
  // 'invoices': one row per bill · 'items': one row per piece sold, with the bill's columns.
  const [view, setView] = useState('invoices');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // 'all' · 'stock' (pieces from stock) · 'custom' (made to order, no SKU)
  const [kind, setKind] = useState('all');
  const q = search.trim().toLowerCase();
  const stockBySku = useMemo(() => new Map(stock.map((st) => [st.skuNo, st])), [stock]);

  const rows = useMemo(() => sales.filter((s) => inRange(s.invoiceDate, from, to)
    && (kind === 'all' || (kind === 'custom') === isCustomSale(s))
    && (!q || [s.invoiceNo, s.customerName, s.contactNo, s.city, ...s.lines.map((l) => l.skuNo)]
      .some((v) => v && v.toLowerCase().includes(q)))), [sales, from, to, q, kind]);

  const itemRows = useMemo(() => rows.flatMap((s) => s.lines.map((l, i) => ({ ...l, sale: s, key: `${s.id}-${i}` }))),
    [rows]);
  const invoicePages = usePaged(rows);
  const itemPages = usePaged(itemRows);

  const remove = async (s) => {
    if (!await confirmDialog({ title: `Delete sales invoice ${s.invoiceNo}?`, message: 'Its pieces will go back into stock.' })) return;
    onDelete(s.id);
  };

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Sales Invoices</h1>
          <p className="page-subtitle">
            {view === 'items' ? `${itemRows.length} items` : `${rows.length} invoices`}
          </p>
        </div>
        <div className="pi-top-actions">
          <div className="pi-toggle" role="tablist">
            <button type="button" className={view === 'invoices' ? 'active' : ''}
              onClick={() => setView('invoices')}>Invoices</button>
            <button type="button" className={view === 'items' ? 'active' : ''}
              onClick={() => setView('items')}>Item View</button>
          </div>
          {canCreate && (
            <button type="button" className="pi-btn-gold" onClick={onNew}>
              <Icon name="plusCircle" size={16} />
              New Sale
            </button>
          )}
        </div>
      </div>


      <div className="pi-card">
        <div className="pi-filters">
          <label className="pi-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Search invoice, customer, mobile, SKU…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="pi-toggle" role="tablist" aria-label="Sale type">
            {[['all', 'All'], ['stock', 'Stock'], ['custom', 'Custom']].map(([k, label]) => (
              <button key={k} type="button" className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{label}</button>
            ))}
          </div>
          <div className="pi-dates">
            <Icon name="calendar" size={15} />
            <span>Date:</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">to</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="pi-table-wrap">
          {view === 'items' ? (
            <table className="pi-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice No</th>
                  <th>SKU No</th>
                  <th>Item</th>
                  <th>Customer</th>
                  <th className="num">Qty</th>
                  <th className="num">Gross Wt</th>
                  <th className="num">Net Wt</th>
                  <th className="num">Metal Amt</th>
                  <th className="num">Dia Amt</th>
                  <th className="num">Stone Amt</th>
                  <th className="num">Making</th>
                  <th className="num">Amount</th>
                  <th className="center">View</th>
                </tr>
              </thead>
              <tbody>
                {itemRows.length === 0 && (
                  <tr><td colSpan={14} className="pi-empty">{sales.length === 0 ? 'No sales yet.' : 'No items match.'}</td></tr>
                )}
                {itemPages.pageRows.map((l) => {
                  const money = (v) => (num(v) ? `₹${formatAmount(v)}` : '—');
                  const weight = (v) => (num(v) ? num(v).toFixed(3) : '—');
                  return (
                    <tr key={l.key}>
                      <td className="muted">{shortDate(l.sale.invoiceDate)}</td>
                      <td><span className="pi-sku">{l.sale.invoiceNo}</span></td>
                      <td>{l.skuNo ? <span className="pi-sku">{l.skuNo}</span> : <span className="so-badge so-custom">Custom</span>}</td>
                      <td>
                        <div className="so-item">
                          {stockBySku.get(l.skuNo)?.thumb
                            ? <PhotoThumb src={stockBySku.get(l.skuNo).thumb} title={l.skuNo} />
                            : <span className="pi-thumb pi-thumb-empty"><Icon name="camera" size={14} /></span>}
                          <div>
                            <div className="pi-item-name">{l.description || stockBySku.get(l.skuNo)?.category || '—'}</div>
                            <div className="pi-item-sub">{l.metalType}</div>
                          </div>
                        </div>
                      </td>
                      <td>{l.sale.customerName}</td>
                      <td className="num"><span className="pi-qty">{l.qty}</span></td>
                      <td className="num mono">{weight(l.grossWeight)}</td>
                      <td className="num mono">{weight(l.netWeight)}</td>
                      <td className="num mono">{money(l.metalAmount)}</td>
                      <td className="num mono">{money(l.diaAmount)}</td>
                      <td className="num mono">{money(l.stoneAmount)}</td>
                      <td className="num mono">{money(l.makingCharges)}</td>
                      <td className="num mono pi-green">₹{formatAmount(saleLineAmount(l))}</td>
                      <td className="center">
                        {onViewOrder && !l.skuNo && l.sale.orderNo && (
                          <button type="button" className="pi-action" title={`View order ${l.sale.orderNo}`}
                            aria-label={`View order ${l.sale.orderNo}`} onClick={() => onViewOrder(l.sale.orderNo)}>
                            <Icon name="eye" size={15} />
                          </button>
                        )}
                        {onViewItem && l.skuNo && (
                          <button type="button" className="pi-action" title="View this item" aria-label={`View item ${l.skuNo}`}
                            onClick={() => onViewItem(l.skuNo)}>
                            <Icon name="eye" size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
          <table className="pi-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Channel</th>
                <th className="num">Qty</th>
                <th className="num">Total</th>
                {showCost && (
                  <>
                    <th className="num">Cost</th>
                    <th className="num">Gross · GP%</th>
                    <th className="num">Exp</th>
                    <th className="num">Net · NP%</th>
                  </>
                )}
                <th>Payment</th>
                <th>Order</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={showCost ? 13 : 9} className="pi-empty">
                    {sales.length === 0 ? 'No sales yet. Click “New Sale” to add one.' : 'No invoices match.'}
                  </td>
                </tr>
              )}
              {invoicePages.pageRows.map((s) => {
                const t = calcSaleTotals(s.lines, s.shipping, s.roundOff);
                const p = saleProfit(s, stockBySku);
                const pct = (v) => (v == null ? '' : `${v.toFixed(2)}%`);
                return (
                  <tr key={s.id}>
                    <td><span className="pi-sku">{s.invoiceNo}</span></td>
                    <td className="muted">{shortDate(s.invoiceDate)}</td>
                    <td>
                      <div className="pi-item-name">{s.customerName}</div>
                      <div className="pi-item-sub">{[s.contactNo, s.city].filter(Boolean).join(' · ')}</div>
                      {s.orderNo && <div className="pi-item-sub">Order {s.orderNo}</div>}
                      {isCustomSale(s) && <span className="so-badge so-custom">Custom</span>}
                    </td>
                    <td className="muted">{s.salesChannel}</td>
                    <td className="num"><span className="pi-qty">{s.lines.reduce((n, l) => n + num(l.qty), 0)}</span></td>
                    <td className="num mono">₹{formatAmount(t.grandTotal)}</td>
                    {showCost && (
                      <>
                        <td className="num mono pi-blue">₹{formatAmount(p.totalCost)}</td>
                        <td className="num mono">
                          ₹{formatAmount(p.gross)}
                          <div><span className={`pi-pr${p.gross < 0 ? ' neg' : ''}`}>{pct(p.grossPercent)}</span></div>
                        </td>
                        <td className="num mono muted">{p.expenses ? `₹${formatAmount(p.expenses)}` : '—'}</td>
                        <td className={`num mono ${p.net < 0 ? 'pi-red' : 'pi-green'}`}>
                          ₹{formatAmount(p.net)}
                          <div><span className={`pi-pr${p.net < 0 ? ' neg' : ''}`}>{pct(p.netPercent)}</span></div>
                        </td>
                      </>
                    )}
                    {/* Both statuses are changed right here; a delivered sale is closed, so its badges stay as they are. */}
                    <td>
                      {canCreate && onChangeStatus && canEditSale(s) ? (
                        <SelectBox value={s.paymentStatus} options={PAYMENT_STATUSES}
                          aria-label={`Payment status of ${s.invoiceNo}`} className={`so-pick so-${s.paymentStatus.toLowerCase()}`}
                          onChange={(paymentStatus) => onChangeStatus(s, { paymentStatus })} />
                      ) : <span className={`so-badge so-${s.paymentStatus.toLowerCase()}`}>{s.paymentStatus}</span>}
                    </td>
                    <td>
                      {canCreate && onChangeStatus && canEditSale(s) ? (
                        <SelectBox value={s.orderStatus} options={ORDER_STATUSES}
                          aria-label={`Order status of ${s.invoiceNo}`} className="so-pick so-order"
                          onChange={(orderStatus) => onChangeStatus(s, { orderStatus })} />
                      ) : <span className="so-badge so-order">{s.orderStatus}</span>}
                    </td>
                    <td className="center">
                      <button type="button" className="pi-action" title="Print bill"
                        aria-label={`Print ${s.invoiceNo}`} onClick={() => printSaleBill(s)}>
                        <Icon name="printer" size={15} />
                      </button>
                      {/* A delivered sale is closed and cannot be edited. */}
                      {canCreate && canEditSale(s) && (
                        <button type="button" className="pi-action" title="Edit invoice"
                          aria-label={`Edit ${s.invoiceNo}`} onClick={() => onEdit(s)}>
                          <Icon name="edit" size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" className="pi-action danger" title="Delete invoice"
                          aria-label={`Delete ${s.invoiceNo}`} onClick={() => remove(s)}>
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
        {view === 'items' ? itemPages.pager : invoicePages.pager}
      </div>
    </div>
  );
}

export default SalesInvoicesPage;
