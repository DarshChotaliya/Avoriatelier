import { useMemo, useState } from 'react';
import Icon from './Icon';
import PhotoThumb from './PhotoThumb';
import { usePaged } from './Pagination';
import { inventoryByGroup, inventoryTotals, stockStatus } from '../utils/inventory';
import { formatAmount, formatWeight } from '../utils/purchaseCalc';
import './PurchaseInvoices.css';
import './MasterPage.css';
import './Inventory.css';

const GROUPS = [
  { key: 'category', label: 'Category' },
  { key: 'metalType', label: 'Metal' },
  { key: 'diamondType', label: 'Diamond' },
  { key: 'supplierName', label: 'Supplier' },
];

function Tile({ label, value, sub, tone }) {
  return (
    <div className={`iv-tile${tone ? ` iv-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

const STATUS_FILTERS = [['all', 'All'], ['in', 'In Stock'], ['sold', 'Sold']];

/** Stock overview: totals, every SKU with its photo and status, and stock by group. */
function InventoryPage({ stock, showCost = true }) {
  const [view, setView] = useState('items');
  const [status, setStatus] = useState('all');
  const [groupBy, setGroupBy] = useState('category');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const totals = useMemo(() => inventoryTotals(stock), [stock]);
  const groups = useMemo(() => inventoryByGroup(stock, groupBy), [stock, groupBy]);

  // Every SKU, newest first; "In Stock" includes partly sold ones, "Sold" only those with nothing left.
  const items = useMemo(() => [...stock]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .filter((s) => status === 'all' || (status === 'sold') === (s.available <= 0))
    .filter((s) => !q || [s.skuNo, s.category, s.collection, s.metalType, s.diamondType, s.designCode, s.supplierName]
      .some((v) => v && String(v).toLowerCase().includes(q))), [stock, status, q]);

  const itemPages = usePaged(items);
  const groupPages = usePaged(groups);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">Stock on hand from purchases minus sales</p>
        </div>
        <div className="pi-top-actions">
          <div className="pi-toggle" role="tablist">
            <button type="button" className={view === 'items' ? 'active' : ''} onClick={() => setView('items')}>
              Stock Items
            </button>
            <button type="button" className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>
              Stock Summary
            </button>
          </div>
        </div>
      </div>

      <div className="iv-tiles">
        <Tile label="In Stock" value={`${totals.pcs} pcs`} sub={`${totals.skus} SKUs`} />
        {showCost && (
          <Tile label="Stock Value (Cost)" value={`₹${formatAmount(totals.costValue)}`} sub="incl. purchase GST" />
        )}
        <Tile label="Net Metal Weight" value={`${formatWeight(totals.netWeight)} g`} />
        <Tile label="Out of Stock" value={`${totals.outOfStock} SKUs`} tone={totals.outOfStock ? 'red' : undefined} />
      </div>

      <div className="pi-card">
        {view === 'items' ? (
          <>
            <div className="pi-filters">
              <label className="pi-search">
                <Icon name="search" size={16} />
                <input type="search" placeholder="Search SKU, item, metal, supplier…" value={search}
                  onChange={(e) => setSearch(e.target.value)} />
              </label>
              <div className="pi-group">
                <span>Show:</span>
                <div className="pi-seg">
                  {STATUS_FILTERS.map(([k, label]) => (
                    <button key={k} type="button" className={status === k ? 'active' : ''} onClick={() => setStatus(k)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pi-table-wrap">
              <table className="pi-table iv-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU No</th>
                    <th>Metal · Diamond</th>
                    <th className="num">Purchased</th>
                    <th className="num">Sold</th>
                    <th className="num">In Stock</th>
                    <th className="center">Status</th>
                    <th className="num">Net Wt (g)</th>
                    {showCost && <th className="num">Cost / Pc</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={showCost ? 9 : 8} className="pi-empty">No items found.</td></tr>
                  )}
                  {itemPages.pageRows.map((s) => {
                    const st = stockStatus(s);
                    return (
                      <tr key={s.skuNo} className={st.key === 'sold' ? 'iv-row-sold' : undefined}>
                        <td>
                          <div className="iv-item-cell">
                            {s.thumb
                              ? <PhotoThumb src={s.thumb} title={s.skuNo} />
                              : <span className="pi-thumb pi-thumb-empty"><Icon name="camera" size={14} /></span>}
                            <div>
                              <div className="pi-item-name">{s.category}{s.designCode ? ` · ${s.designCode}` : ''}</div>
                              <div className="pi-item-sub">{s.collection || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="pi-sku">{s.skuNo}</span></td>
                        <td>{[s.metalType, s.diamondType].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="num">{s.purchased}</td>
                        <td className="num muted">{s.purchased - s.available}</td>
                        <td className="num"><span className={`sku-stock${s.available <= 0 ? ' out' : ''}`}>{s.available}</span></td>
                        <td className="center"><span className={`iv-status iv-status-${st.key}`}>{st.label}</span></td>
                        <td className="num mono">{formatWeight(s.netWeight)}</td>
                        {showCost && <td className="num mono pi-blue">₹{formatAmount(s.costPerPiece)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {itemPages.pager}
          </>
        ) : (
          <>
            <div className="pi-filters">
              <div className="pi-group iv-left">
                <span>Group by:</span>
                <div className="pi-seg">
                  {GROUPS.map((g) => (
                    <button key={g.key} type="button" className={groupBy === g.key ? 'active' : ''}
                      onClick={() => setGroupBy(g.key)}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pi-table-wrap">
              <table className="pi-table">
                <thead>
                  <tr>
                    <th>{GROUPS.find((g) => g.key === groupBy).label}</th>
                    <th className="num">SKUs</th>
                    <th className="num">Purchased</th>
                    <th className="num">Sold</th>
                    <th className="num">In Stock</th>
                    <th className="num">Net Wt (g)</th>
                    {showCost && <th className="num">Cost Value</th>}
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && (
                    <tr><td colSpan={showCost ? 7 : 6} className="pi-empty">No stock yet. Add a purchase invoice first.</td></tr>
                  )}
                  {groupPages.pageRows.map((g) => (
                    <tr key={g.label}>
                      <td><span className="pi-item-name">{g.label}</span></td>
                      <td className="num">{g.skus}</td>
                      <td className="num">{g.purchased}</td>
                      <td className="num muted">{g.sold}</td>
                      <td className="num"><span className={`sku-stock${g.pcs <= 0 ? ' out' : ''}`}>{g.pcs}</span></td>
                      <td className="num mono">{formatWeight(g.netWeight)}</td>
                      {showCost && <td className="num mono pi-blue">₹{formatAmount(g.costValue)}</td>}
                    </tr>
                  ))}
                </tbody>
                {groups.length > 0 && (
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="num">{stock.length}</td>
                      <td className="num">{groups.reduce((n, g) => n + g.purchased, 0)}</td>
                      <td className="num">{groups.reduce((n, g) => n + g.sold, 0)}</td>
                      <td className="num">{totals.pcs}</td>
                      <td className="num mono">{formatWeight(totals.netWeight)}</td>
                      {showCost && <td className="num mono">₹{formatAmount(totals.costValue)}</td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {groupPages.pager}
          </>
        )}
      </div>
    </div>
  );
}

export default InventoryPage;
