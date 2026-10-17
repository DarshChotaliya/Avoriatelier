import { useMemo, useState } from 'react';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import { COMPANY } from '../constants/company';
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
      <td class="r">₹${formatAmount(l.gst)}</td>
      <td class="r"><b>₹${formatAmount(l.total)}</b></td>
    </tr>`).join('');
  const sum = (k) => q.lines.reduce((t, l) => t + (Number(l[k]) || 0), 0);
  const metalTotal = sum('metalAmount');
  const labourTotal = sum('labourAmount');
  const extraTotal = sum('diamondAmount') + sum('stoneAmount') + sum('otherCharges') + sum('cadCharge');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(q.quotationNo)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: Inter, Segoe UI, sans-serif; color: #1c2b28; margin: 0; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { max-width: 190mm; margin: 0 auto; padding: 16px; }
      h1 { color: #04443b; margin: 0; font-size: 28px; letter-spacing: 0.3em; }
      .muted { color: #687a76; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #c9a96e; padding-bottom: 12px; }
      .co { margin-top: 6px; font-size: 11px; line-height: 1.5; color: #687a76; }
      .doc { text-align: right; }
      .doc .title { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #c9a96e; font-weight: 700; }
      .doc .no { font-size: 20px; font-weight: 700; color: #04443b; margin: 2px 0; }
      .to { margin: 16px 0 4px; padding: 10px 12px; border-left: 3px solid #c9a96e; background: #f6f3ec; }
      .to small { display: block; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #687a76; }
      .to b { font-size: 15px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; table-layout: fixed; }
      th { background: #04443b; color: #fff; text-align: left; padding: 7px 6px; font-size: 10.5px; font-weight: 600; }
      td { border-bottom: 1px solid #dbe4e1; padding: 8px 6px; vertical-align: top; overflow-wrap: anywhere; }
      th.r, td.r { text-align: right; }
      td.r { white-space: nowrap; }
      tr { page-break-inside: avoid; }
      td small { color: #687a76; }
      td img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; float: left; margin-right: 8px; }
      .sum { width: 82mm; margin: 16px 0 0 auto; border: 1px solid #dbe4e1; border-radius: 8px; overflow: hidden; }
      .sum div { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #eef2f0; }
      .sum .grand { background: #04443b; color: #fff; font-size: 15px; font-weight: 700; border-bottom: 0; }
      .sum .bal { font-weight: 700; color: #04443b; border-bottom: 0; }
      .note { margin-top: 18px; font-size: 11px; color: #687a76; line-height: 1.5; }
      .sign { display: flex; justify-content: space-between; margin-top: 56px; font-size: 11px; color: #687a76; }
      .sign span { width: 55mm; padding-top: 6px; border-top: 1px solid #9aa9a5; text-align: center; }
    </style></head><body><div class="sheet">
    <div class="head">
      <div>
        <h1>AVORI</h1>
        <div class="co"><b>${escape(COMPANY.legalName)}</b><br>${escape(COMPANY.address)}<br>
          ${escape(COMPANY.contact)} · ${escape(COMPANY.email)}<br>GSTIN ${escape(COMPANY.gstin)}</div>
      </div>
      <div class="doc">
        <div class="title">Quotation</div>
        <div class="no">${escape(q.quotationNo)}</div>
        <div class="muted">${shortDate(q.quotationDate)} · ${escape(q.branch)}</div>
      </div>
    </div>
    <div class="to"><small>Quotation for</small><b>${escape(q.customerName)}</b>${q.contactNo ? `<br><span class="muted">${escape(q.contactNo)}</span>` : ''}</div>
    <table>
      <colgroup><col style="width:4%"><col style="width:22%"><col style="width:8%"><col style="width:8%"><col style="width:5%">
        <col style="width:12%"><col style="width:10%"><col style="width:12%"><col style="width:9%"><col style="width:10%"></colgroup>
      <thead><tr><th>#</th><th>Design</th><th>Metal</th><th class="r">Net wt</th><th class="r">Qty</th>
        <th class="r">Metal</th><th class="r">Labour</th><th class="r">Stones / other</th><th class="r">GST</th>
        <th class="r">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sum">
      <div><span>Metal</span><span>₹${formatAmount(metalTotal)}</span></div>
      <div><span>Labour</span><span>₹${formatAmount(labourTotal)}</span></div>
      <div><span>Diamonds, stones &amp; other</span><span>₹${formatAmount(extraTotal)}</span></div>
      <div><span>GST</span><span>₹${formatAmount(sum('gst'))}</span></div>
      <div class="grand"><span>Total</span><span>₹${formatAmount(q.grandTotal)}</span></div>
      ${q.advance > 0 ? `<div><span>Advance</span><span>₹${formatAmount(q.advance)}</span></div>
      <div class="bal"><span>Balance</span><span>₹${formatAmount(q.balance)}</span></div>` : ''}
    </div>
    ${q.notes ? `<p class="note"><b>Notes:</b> ${escape(q.notes)}</p>` : ''}
    <p class="note">Weights are estimates; the final price follows the actual weight and the metal rate on the day of the
      order.</p>
    <div class="sign"><span>Customer signature</span><span>For ${escape(COMPANY.legalName)}</span></div>
    </div><script>window.onload = () => window.print();</script>
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
