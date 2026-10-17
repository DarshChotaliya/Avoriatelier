import { useMemo, useState } from 'react';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import { formatAmount } from '../utils/purchaseCalc';
import './PurchaseInvoices.css';
import './SalesInvoice.css';
import './Quotation.css';

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** A printable quotation for the customer (opens the browser's print dialog in a new window). */
export function printQuotation(q) {
  const rows = q.lines.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.isCustom
    ? `${l.photo ? `<img src="${l.photo}" alt="">` : ''}<b>Custom design</b><br><small>${escape([l.category, l.size, l.description].filter(Boolean).join(' · '))}</small>`
    : `<b>${escape(l.skuNo)}</b><br><small>${escape(l.description)}</small>`}</td>
      <td>${escape(l.toMetal)}</td>
      <td class="r">${l.weight} g</td>
      <td class="r">${l.qty}</td>
      <td class="r">₹${formatAmount(l.metalAmount)}</td>
      <td class="r">₹${formatAmount(l.labourAmount)}</td>
      <td class="r">₹${formatAmount(l.diamondAmount + l.stoneAmount + l.otherCharges + l.cadCharge)}</td>
      <td class="r">₹${formatAmount(l.taxable)}</td>
      <td class="r">₹${formatAmount(l.gst)}</td>
      <td class="r"><b>₹${formatAmount(l.total)}</b></td>
    </tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(q.quotationNo)}</title>
    <style>
      body { font-family: Inter, Segoe UI, sans-serif; color: #1c2b28; margin: 32px; }
      h1 { color: #04443b; margin: 0; letter-spacing: 0.2em; }
      .head { display: flex; justify-content: space-between; border-bottom: 2px solid #c9a96e; padding-bottom: 12px; }
      .muted { color: #687a76; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
      th { background: #04443b; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; }
      td { border-bottom: 1px solid #dbe4e1; padding: 6px 8px; vertical-align: top; }
      .r { text-align: right; white-space: nowrap; }
      .total { margin-top: 16px; text-align: right; font-size: 18px; }
      .total b { color: #04443b; }
      .note { margin-top: 24px; font-size: 12px; color: #687a76; }
      td img { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; float: left; margin-right: 8px; }
    </style></head><body>
    <div class="head">
      <div><h1>AVORI</h1><div class="muted">Quotation</div></div>
      <div style="text-align:right">
        <b>${escape(q.quotationNo)}</b><br><span class="muted">${shortDate(q.quotationDate)} · ${escape(q.branch)}</span>
      </div>
    </div>
    <p><b>${escape(q.customerName)}</b>${q.contactNo ? `<br><span class="muted">${escape(q.contactNo)}</span>` : ''}</p>
    <table>
      <thead><tr><th>#</th><th>Design</th><th>Metal</th><th class="r">Net wt</th><th class="r">Qty</th>
        <th class="r">Metal</th><th class="r">Labour</th><th class="r">Diamond / stones / other</th><th class="r">Taxable</th>
        <th class="r">GST</th><th class="r">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">Total: <b>₹${formatAmount(q.grandTotal)}</b></div>
    ${q.advance > 0 ? `<div class="total" style="font-size:14px">Advance: ₹${formatAmount(q.advance)} · Balance: <b>₹${formatAmount(q.balance)}</b></div>` : ''}
    ${q.notes ? `<p class="note">${escape(q.notes)}</p>` : ''}
    <p class="note">Weights are estimates; the final price follows the actual weight and the metal rate on the day of the
      order.</p>
    <script>window.onload = () => window.print();</script>
    </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function QuotationsPage({
  quotations, onNew, onNewCustom, onEdit, onDelete, onCreateOrder, ordersByQuotation, canCreate = true, canDelete = true,
}) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const rows = useMemo(() => quotations.filter((x) => !q
    || [x.quotationNo, x.customerName, x.contactNo, x.status, ...x.lines.flatMap((l) => [l.skuNo, l.toMetal])]
      .some((v) => v && v.toLowerCase().includes(q))), [quotations, q]);

  const remove = async (x) => {
    if (!await confirmDialog({ title: `Delete quotation ${x.quotationNo}?`, message: `Quotation for ${x.customerName} will be removed.` })) {
      return;
    }
    onDelete(x.id);
  };

  const { pageRows, pager } = usePaged(rows);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Quotations</h1>
          <p className="page-subtitle">{rows.length} quotations · a design from stock priced in another metal</p>
        </div>
        <div className="pi-top-actions">
          {canCreate && (
            <>
              <button type="button" className="pi-btn-gold qt-new-custom" onClick={onNewCustom}
                title="The customer's own design, e.g. a Pinterest picture">
                <Icon name="plusCircle" size={16} />
                Custom Quotation
              </button>
              <button type="button" className="pi-btn-gold" onClick={onNew}>
                <Icon name="plusCircle" size={16} />
                New Quotation
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pi-card">
        <div className="pi-filters">
          <label className="pi-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Search quotation, customer, mobile, SKU, metal…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        <div className="pi-table-wrap">
          <table className="pi-table">
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Designs</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th className="qt-actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="pi-empty">
                    {quotations.length === 0 ? 'No quotations yet. Click “New Quotation” to add one.' : 'No quotations match.'}
                  </td>
                </tr>
              )}
              {pageRows.map((x) => (
                <tr key={x.id}>
                  <td><span className="pi-sku">{x.quotationNo}</span></td>
                  <td className="muted">{shortDate(x.quotationDate)}</td>
                  <td>
                    <div className="pi-item-name">{x.customerName}</div>
                    <div className="pi-item-sub">{x.contactNo}</div>
                  </td>
                  <td>
                    {x.lines.map((l, i) => (
                      // Lines have no id; their order is fixed.
                      <div key={i} className="pi-item-sub">
                        {l.isCustom
                          ? <><b>Custom</b> · {l.category || l.description} → {l.toMetal} · ~{l.weight} g</>
                          : <><b>{l.skuNo}</b> · {l.fromMetal} → {l.toMetal} · {l.weight} g</>}
                      </div>
                    ))}
                  </td>
                  <td className="num mono">₹{formatAmount(x.grandTotal)}</td>
                  <td><span className={`so-badge qt-${x.status.toLowerCase()}`}>{x.status}</span></td>
                  <td>
                    {/* Right-aligned so Print / Edit / Delete line up whether or not "Order" is shown. */}
                    <div className="qt-actions">
                    {x.status === 'Accepted' && ordersByQuotation?.get(x.quotationNo) && (
                      <span className="qt-ordered" title="Order made from this quotation">
                        {ordersByQuotation.get(x.quotationNo)}
                      </span>
                    )}
                    {canCreate && x.status === 'Accepted' && !ordersByQuotation?.get(x.quotationNo) && (
                      <button type="button" className="qt-order-btn" title="Create an order from this quotation"
                        aria-label={`Create order from ${x.quotationNo}`} onClick={() => onCreateOrder(x)}>
                        <Icon name="clipboard" size={14} />
                        Order
                      </button>
                    )}
                    <button type="button" className="pi-action" title="Print" aria-label={`Print ${x.quotationNo}`}
                      onClick={() => printQuotation(x)}>
                      <Icon name="printer" size={15} />
                    </button>
                    {canCreate && (
                      <button type="button" className="pi-action" title="Edit" aria-label={`Edit ${x.quotationNo}`}
                        onClick={() => onEdit(x)}>
                        <Icon name="edit" size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" className="pi-action danger" title="Delete"
                        aria-label={`Delete ${x.quotationNo}`} onClick={() => remove(x)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pager}
      </div>
    </div>
  );
}

export default QuotationsPage;
