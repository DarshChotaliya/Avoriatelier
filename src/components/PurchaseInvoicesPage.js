import { Fragment, useMemo, useState } from 'react';
import { usePaged } from './Pagination';
import { alertDialog, confirmDialog } from './ConfirmDialog';
import { printTags } from '../utils/productTag';
import Icon from './Icon';
import PhotoThumb from './PhotoThumb';
import InvoiceTagModal from './InvoiceTagModal';
import SelectBox from './SelectBox';
import { deletePurchaseInvoice, deletePurchaseItem, toItemRows } from '../utils/draftInvoices';
import { calcInvoiceItem, calcInvoiceTotals } from '../utils/invoiceCalc';
import { formatAmount, formatWeight, num } from '../utils/purchaseCalc';
import { DIAMOND_TYPES } from '../constants/purchaseOptions';
import './PurchaseInvoices.css';

const GROUPS = [
  { key: 'supplier', label: 'Supplier', icon: 'building' },
  { key: 'category', label: 'Category', icon: 'folder' },
  { key: 'all', label: 'All Items', icon: 'list' },
];

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const diamondLabel = (v) => DIAMOND_TYPES.find((d) => d.value === v)?.label ?? v;

const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

function PurchaseInvoicesPage({
  drafts, soldSkus, onChanged, onNew, onEdit, onEditItem, onView, canEdit = true, canDelete = true, metalTypes = [],
}) {
  const [view, setView] = useState('invoices');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState('all');
  // The print-tags dialog that is open (all tags, or a custom pick): { label, items } for one invoice or for every item.
  const [tagDialog, setTagDialog] = useState(null);
  // Item view: only the pieces of one category ('' = every category).
  const [category, setCategory] = useState('');
  // Invoice ids whose items are shown under their row in the Invoices view.
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpanded = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const q = search.trim().toLowerCase();

  const categories = useMemo(
    () => [...new Set(toItemRows(drafts).map((r) => r.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [drafts]);

  const rows = useMemo(() => toItemRows(drafts).filter((r) => inRange(r.purchaseDate, from, to)
    && (!category || r.category === category)
    && (!q || [r.skuNo, r.category, r.collection, r.supplierName]
      .some((v) => v && v.toLowerCase().includes(q)))), [drafts, from, to, q, category]);

  const invoices = useMemo(() => drafts.filter((d) => inRange(d.purchaseDate, from, to)
    && (!q || [d.supplierName, d.supplierInvoiceNo, ...d.items.map((i) => i.skuNo)]
      .some((v) => v && v.toLowerCase().includes(q)))), [drafts, from, to, q]);

  // Item view: the items are paged (kept together by supplier / category when grouped), then the page is grouped.
  const groupField = { supplier: 'supplierName', category: 'category' }[groupBy];
  const ordered = useMemo(() => (groupField
    ? [...rows].sort((x, y) => (x[groupField] || '—').localeCompare(y[groupField] || '—'))
    : rows), [rows, groupField]);
  const itemPages = usePaged(ordered);

  // [{ key, label, rows }] — a single unnamed group for "All Items".
  const groups = [];
  itemPages.pageRows.forEach((r) => {
    const label = groupField ? r[groupField] || '—' : null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ key: label ?? 'all', label, rows: [r] });
  });

  const removeItem = async (row) => {
    // Deleting a purchase whose piece was sold would make stock negative.
    if (soldSkus.has(row.skuNo)) {
      alertDialog(`${row.skuNo} is used in a sales invoice. Delete that sale first.`);
      return;
    }
    if (!await confirmDialog({ title: `Delete item ${row.skuNo}?`, message: 'This purchase item and its stock will be removed.' })) {
      return;
    }
    try {
      await deletePurchaseItem(row.invoiceId, row.id);
      await onChanged();
    } catch (e) {
      alertDialog(e.message);
    }
  };

  const removeInvoice = async (inv) => {
    const sold = inv.items.filter((i) => soldSkus.has(i.skuNo)).map((i) => i.skuNo);
    if (sold.length > 0) {
      alertDialog(`${sold.join(', ')} ${sold.length === 1 ? 'is' : 'are'} used in sales invoices. Delete those sales first.`);
      return;
    }
    const items = `${inv.items.length} item${inv.items.length === 1 ? '' : 's'}`;
    if (!await confirmDialog({ title: 'Delete purchase invoice?', message: `Invoice from ${inv.supplierName} with ${items} will be removed.` })) {
      return;
    }
    try {
      await deletePurchaseInvoice(inv.id);
      await onChanged();
    } catch (e) {
      alertDialog(e.message);
    }
  };

  const count = view === 'items' ? rows.length : invoices.length;
  const invoicePages = usePaged(invoices);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Purchase Invoices</h1>
          <p className="page-subtitle">{count} {view === 'items' ? 'items' : 'invoices'}</p>
        </div>
        <div className="pi-top-actions">
          <div className="pi-toggle" role="tablist">
            <button type="button" className={view === 'invoices' ? 'active' : ''}
              onClick={() => setView('invoices')}>Invoices</button>
            <button type="button" className={view === 'items' ? 'active' : ''}
              onClick={() => setView('items')}>Item View</button>
          </div>
          {canEdit && (
            <button type="button" className="pi-btn-gold" onClick={onNew}>
              <Icon name="plusCircle" size={16} />
              New Invoice
            </button>
          )}
        </div>
      </div>


      <div className="pi-card">
        <div className="pi-filters">
          <label className="pi-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Search SKU, item, supplier…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="pi-dates">
            <Icon name="calendar" size={15} />
            <span>Date:</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <span className="muted">to</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          {view === 'items' && (
            <div className="pi-category">
              <Icon name="folder" size={15} />
              <span>Category:</span>
              <SelectBox value={category} options={categories} placeholder="Select category" className="pi-cat-pick"
                aria-label="Category" onChange={setCategory} />
              {category && (
                <button type="button" className="pi-cat-clear" title="Show every category" aria-label="Clear category"
                  onClick={() => setCategory('')}>
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
          )}
          {view === 'items' && (
            <button type="button" className="pi-print-tags" title="Print QR tags: all items, or pick by gender and category"
              onClick={() => setTagDialog({ label: 'All items', items: toItemRows(drafts) })}>
              <Icon name="printer" size={15} />
              Print tags
            </button>
          )}
          {view === 'items' && (
            <div className="pi-group">
              <span>Group by:</span>
              <div className="pi-seg" role="radiogroup" aria-label="Group by">
                {GROUPS.map((g) => (
                  <button key={g.key} type="button" role="radio" aria-checked={groupBy === g.key}
                    className={groupBy === g.key ? 'active' : ''} onClick={() => setGroupBy(g.key)}>
                    <Icon name={g.icon} size={14} />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pi-table-wrap">
          {view === 'items' ? (
            <table className="pi-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>SKU No</th>
                  <th>Image</th>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Purch. Price</th>
                  <th className="num">Purch. (GST)</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="pi-empty">
                      {drafts.length === 0 ? 'No invoices yet. Click “New Invoice” to add one.' : 'No items match.'}
                    </td>
                  </tr>
                )}
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    {g.label && (
                      <tr className="pi-group-row">
                        <td colSpan={4}>{g.label} <span>{g.rows.length} items</span></td>
                        <td className="num">{g.rows.reduce((s, r) => s + num(r.qty), 0)}</td>
                        <td colSpan={3} />
                      </tr>
                    )}
                    {g.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="muted">{shortDate(r.purchaseDate)}</td>
                        <td><span className="pi-sku">{r.skuNo}</span></td>
                        <td>
                          {r.thumb
                            ? <PhotoThumb src={r.thumb} title={r.skuNo} />
                            : <span className="pi-thumb pi-thumb-empty"><Icon name="camera" size={16} /></span>}
                        </td>
                        <td>
                          <div className="pi-item-name">
                            {r.category}{r.collection ? ` · ${r.collection}` : ''}
                          </div>
                          <div className="pi-item-sub">
                            {r.supplierName} · {r.metalType ?? r.sampleMetal} · {diamondLabel(r.diamondType)}
                          </div>
                        </td>
                        <td className="num"><span className="pi-qty">{r.qty}</span></td>
                        <td className="num mono">₹{formatAmount(r.price)}</td>
                        <td className="num mono pi-blue">₹{formatAmount(r.purchWithGst)}</td>
                        <td className="center mp-actions">
                          <button type="button" className="pi-action" title="View item"
                            aria-label={`View ${r.skuNo}`}
                            onClick={() => onView(drafts.find((d) => d.id === r.invoiceId), r.id)}>
                            <Icon name="eye" size={15} />
                          </button>
                          <button type="button" className="pi-action" title="Print QR tag"
                            aria-label={`Print tag ${r.skuNo}`} onClick={() => printTags([r], metalTypes)}>
                            <Icon name="printer" size={15} />
                          </button>
                          {canEdit && (
                            <button type="button" className="pi-action" title="Edit item"
                              aria-label={`Edit ${r.skuNo}`}
                              onClick={() => onEditItem(drafts.find((d) => d.id === r.invoiceId), r.id)}>
                              <Icon name="edit" size={15} />
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" className="pi-action danger" title="Delete item"
                              aria-label={`Delete ${r.skuNo}`} onClick={() => removeItem(r)}>
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="pi-table">
              <thead>
                <tr>
                  <th className="pi-expand-col" aria-label="Show items" />
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Supp. Invoice</th>
                  <th>Branch</th>
                  <th className="num">Items</th>
                  <th className="num">Qty</th>
                  <th className="num">Net Wt (g)</th>
                  <th className="num">Taxable</th>
                  <th className="num">GST</th>
                  <th className="num">Total</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={12} className="pi-empty">
                      {drafts.length === 0 ? 'No invoices yet. Click “New Invoice” to add one.' : 'No invoices match.'}
                    </td>
                  </tr>
                )}
                {invoicePages.pageRows.map((inv) => {
                  const t = calcInvoiceTotals(inv.items);
                  const isOpen = expanded.has(inv.id);
                  return (
                    <Fragment key={inv.id}>
                    <tr className={isOpen ? 'pi-row-open' : undefined}>
                      <td className="pi-expand-col">
                        <button type="button" className={`pi-expand${isOpen ? ' open' : ''}`}
                          aria-expanded={isOpen} aria-label={isOpen ? 'Hide items' : `Show ${inv.items.length} items`}
                          title={isOpen ? 'Hide items' : 'Show items'} onClick={() => toggleExpanded(inv.id)}>
                          <Icon name={isOpen ? 'minus' : 'plus'} size={14} />
                        </button>
                      </td>
                      <td className="muted">{shortDate(inv.purchaseDate)}</td>
                      <td><div className="pi-item-name">{inv.supplierName}</div></td>
                      <td className="muted">{inv.supplierInvoiceNo || '—'}</td>
                      <td>{inv.branch}</td>
                      <td className="num">{inv.items.length}</td>
                      <td className="num">{inv.items.reduce((s, i) => s + num(i.qty), 0)}</td>
                      <td className="num mono">{formatWeight(t.netWeight)}</td>
                      <td className="num mono">₹{formatAmount(t.taxable)}</td>
                      <td className="num mono pi-blue">₹{formatAmount(t.cgst + t.sgst + t.igst)}</td>
                      <td className="num mono pi-green">₹{formatAmount(t.grandTotal)}</td>
                      <td className="center mp-actions">
                        <button type="button" className="pi-action" title="View invoice"
                          aria-label="View invoice" onClick={() => onView(inv)}>
                          <Icon name="eye" size={15} />
                        </button>
                        <button type="button" className="pi-action" title="Print QR tags for every item"
                          aria-label="Print invoice tags"
                          onClick={() => setTagDialog({ label: inv.supplierInvoiceNo || `#${inv.id}`, items: inv.items })}>
                          <Icon name="printer" size={15} />
                        </button>
                        {canEdit && (
                          <button type="button" className="pi-action" title="Edit invoice"
                            aria-label="Edit invoice" onClick={() => onEdit(inv)}>
                            <Icon name="edit" size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" className="pi-action danger" title="Delete invoice"
                            aria-label="Delete invoice" onClick={() => removeInvoice(inv)}>
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="pi-sub-row">
                        <td colSpan={12}>
                          <table className="pi-sub-table">
                            <thead>
                              <tr>
                                <th>SKU No</th>
                                <th>Image</th>
                                <th>Item</th>
                                <th className="num">Qty</th>
                                <th className="num">Net Wt (g)</th>
                                <th className="num">Cost / pc</th>
                                <th className="num">Gross</th>
                                <th className="center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inv.items.map((item) => {
                                const c = calcInvoiceItem(item);
                                return (
                                  <tr key={item.id}>
                                    <td><span className="pi-sku">{item.skuNo}</span></td>
                                    <td>
                                      {item.thumb
                                        ? <PhotoThumb src={item.thumb} title={item.skuNo} />
                                        : <span className="pi-thumb pi-thumb-empty"><Icon name="camera" size={16} /></span>}
                                    </td>
                                    <td>
                                      <div className="pi-item-name">
                                        {item.category}{item.collection ? ` · ${item.collection}` : ''}
                                      </div>
                                      <div className="pi-item-sub">
                                        {[item.metalType ?? item.sampleMetal, diamondLabel(item.diamondType)]
                                          .filter(Boolean).join(' · ')}
                                      </div>
                                    </td>
                                    <td className="num"><span className="pi-qty">{item.qty}</span></td>
                                    <td className="num mono">{formatWeight(c.totalNetWeight)}</td>
                                    <td className="num mono pi-blue">₹{formatAmount(c.costPerPiece)}</td>
                                    <td className="num mono pi-green">₹{formatAmount(c.grossAmount)}</td>
                                    <td className="center mp-actions">
                                      <button type="button" className="pi-action" title="View item"
                                        aria-label={`View ${item.skuNo}`} onClick={() => onView(inv, item.id)}>
                                        <Icon name="eye" size={15} />
                                      </button>
                                      <button type="button" className="pi-action" title="Print QR tag"
                                        aria-label={`Print tag ${item.skuNo}`}
                                        onClick={() => printTags([item], metalTypes)}>
                                        <Icon name="printer" size={15} />
                                      </button>
                                      {canEdit && (
                                        <button type="button" className="pi-action" title="Edit item"
                                          aria-label={`Edit ${item.skuNo}`} onClick={() => onEditItem(inv, item.id)}>
                                          <Icon name="edit" size={15} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {view === 'items' ? itemPages.pager : invoicePages.pager}
      </div>
      {tagDialog && (
        <InvoiceTagModal invoiceNo={tagDialog.label} items={tagDialog.items}
          onPrint={(list) => printTags(list, metalTypes)} onClose={() => setTagDialog(null)} />
      )}
    </div>
  );
}

export default PurchaseInvoicesPage;
