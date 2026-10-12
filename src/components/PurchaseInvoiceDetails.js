import { useEffect } from 'react';
import Icon from './Icon';
import CostBreakdown from './CostBreakdown';
import PhotoThumb from './PhotoThumb';
import { calcInvoiceItem, calcInvoiceTotals, diamondAmount, stoneAmount } from '../utils/invoiceCalc';
import { formatAmount, formatWeight } from '../utils/purchaseCalc';
import { STONE_PRICING } from '../constants/masterConfig';
import './PurchaseInvoice.css';
import './PurchaseItemDetails.css';

const money = (v) => `₹${formatAmount(v)}`;
const grams = (v) => `${formatWeight(v)} g`;
const date = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');
const pricingLabel = (v) => STONE_PRICING.find((p) => p.value === v)?.label ?? v;

function Info({ label, children }) {
  return (
    <div className="pd-info">
      <span>{label}</span>
      <strong>{children === '' || children == null ? '—' : children}</strong>
    </div>
  );
}

/** Everything about one purchase item: what it is, metal, labour, pricing, stones, diamonds and cost. */
function ItemDetails({ item, index, showHeader }) {
  const c = calcInvoiceItem(item);
  return (
    <div className="pd-item">
      {showHeader && (
        <div className="pd-item-head">
          <strong>Item {index + 1} · {item.skuNo}</strong>
          <span className="pd-amount">{money(c.grossAmount)}</span>
        </div>
      )}
      <div className="pdi-top">
        {item.thumb
          ? <PhotoThumb src={item.thumb} title={item.skuNo} className="pdi-photo" />
          : <span className="pdi-photo pdi-photo-empty"><Icon name="camera" size={22} /></span>}
        <div className="pd-grid">
          <Info label="SKU No"><span className="pdi-sku">{item.skuNo}</span></Info>
          <Info label="Category">{item.category}</Info>
          <Info label="Collection">{item.collection}</Info>
          <Info label="Diamond Type">{item.diamondType}</Info>
          <Info label="Qty">{item.qty}</Info>
          <Info label="Size">{item.size}</Info>
          <Info label="Description">{item.description}</Info>
        </div>
      </div>

      <div className="pdi-groups">
        <div className="pdi-group">
          <h4>Metal</h4>
          <div className="pd-grid">
            <Info label="Quality">{item.metalType ?? item.sampleMetal}</Info>
            <Info label="Gross Wt">{grams(item.grossWeight)}</Info>
            <Info label="Net Wt">{grams(item.netWeight)}</Info>
            <Info label="Metal Rate / Gram">{money(item.metalRate)}</Info>
            <Info label="Metal Amount">{money(c.metal)}</Info>
          </div>
        </div>
        <div className="pdi-group">
          <h4>Labour &amp; Charges</h4>
          <div className="pd-grid">
            <Info label={item.labourFixed ? 'Labour (fixed)' : 'Labour / g'}>{money(item.labourRate)}</Info>
            <Info label="Labour Amount">{money(c.labour)}</Info>
            <Info label="Hallmark">{money(item.hallmark)}</Info>
            <Info label="Other">{money(item.otherCharges)}</Info>
          </div>
        </div>
      </div>

      {(item.stones ?? []).length > 0 && (
        <div className="pdi-block">
        <h4 className="pdi-block-title">Stones</h4>
        <table className="pdi-table">
          <thead>
            <tr>
              <th>Stone</th><th>Color</th><th>Shape</th><th>Pricing</th><th>Size</th><th className="num">Pcs</th>
              <th className="num">Wt (ct)</th><th className="num">Rate</th><th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {item.stones.map((s, i) => (
              // Stored rows have no id; their order never changes here.
              <tr key={i}>
                <td>{s.stoneName || '—'}</td>
                <td>{s.color || '—'}</td>
                <td>{s.stoneType}</td>
                <td className="muted">{pricingLabel(s.pricing)}</td>
                <td>{s.size || '—'}</td>
                <td className="num">{s.pcs}</td>
                <td className="num mono">{formatWeight(s.weight)}</td>
                <td className="num mono">{money(s.rate)} {s.pricing === 'perCert' ? '/ pc' : '/ ct'}</td>
                <td className="num mono">{money(stoneAmount(s))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {(item.diamonds ?? []).length > 0 && (
        <div className="pdi-block">
        <h4 className="pdi-block-title">Diamonds</h4>
        <table className="pdi-table">
          <thead>
            <tr>
              <th>Shape</th><th>Diamond Type</th><th>Size (mm)</th><th className="num">Pcs</th>
              <th className="num">Rate / ct</th><th className="num">Wt (ct)</th><th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {item.diamonds.map((d, i) => (
              // Stored rows have no id; their order never changes here.
              <tr key={i}>
                <td>{d.code || '—'}</td>
                <td>{d.diamondType || '—'}</td>
                <td>{d.size || '—'}</td>
                <td className="num">{d.pcs}</td>
                <td className="num mono">{money(d.rate)}</td>
                <td className="num mono">{formatWeight(d.weight)}</td>
                <td className="num mono">{money(diamondAmount(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <CostBreakdown item={item} c={c} />
    </div>
  );
}

/**
 * Read-only view of a purchase invoice. With `itemId` only that item is shown (Item View);
 * otherwise the whole invoice with its totals (Invoices view).
 */
function PurchaseInvoiceDetails({ invoice, itemId, onEdit, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const items = itemId ? invoice.items.filter((i) => i.id === itemId) : invoice.items;
  const t = calcInvoiceTotals(invoice.items);
  const igst = invoice.igst ?? invoice.items.some((i) => i.igst);
  const title = itemId ? `Item ${items[0]?.skuNo ?? ''}` : `Purchase Invoice${invoice.supplierInvoiceNo ? ` ${invoice.supplierInvoiceNo}` : ''}`;

  return (
    <div className="inv-overlay">
      <div className="inv-modal pd-modal pd-wide" role="dialog" aria-modal="true" aria-label={title}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="eye" size={22} /></span>
          <div>
            <h2>{title}</h2>
            <p>{date(invoice.purchaseDate)} · {invoice.supplierName}</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          <section className="inv-card">
            <h3 className="inv-section-title">Invoice</h3>
            <div className="pd-grid">
              <Info label="Purchase Date">{date(invoice.purchaseDate)}</Info>
              <Info label="Branch">{invoice.branch}</Info>
              <Info label="Supplier">{invoice.supplierName}</Info>
              <Info label="Supplier Invoice No.">{invoice.supplierInvoiceNo}</Info>
              <Info label="Supplier Invoice Date">{invoice.supplierInvoiceDate ? date(invoice.supplierInvoiceDate) : null}</Info>
              <Info label="GST Type">{igst ? 'Inter-state (IGST)' : 'Same state (CGST + SGST)'}</Info>
              <Info label="Remarks">{invoice.remarks}</Info>
            </div>
          </section>

          <section className="inv-card">
            <h3 className="inv-section-title">{itemId ? 'Item' : `Items (${items.length})`}</h3>
            {items.map((item, i) => (
              <ItemDetails key={item.id} item={item} index={i} showHeader={!itemId} />
            ))}
          </section>

          {!itemId && (
            <section className="inv-card">
              <h3 className="inv-section-title">Tax &amp; Total</h3>
              <div className="pd-grid">
                <Info label="Net Weight">{grams(t.netWeight)}</Info>
                <Info label="Stone Weight">{`${formatWeight(t.stoneCt)} ct`}</Info>
                <Info label="Taxable">{money(t.taxable)}</Info>
                {igst ? <Info label="IGST">{money(t.igst)}</Info> : (
                  <>
                    <Info label="CGST">{money(t.cgst)}</Info>
                    <Info label="SGST">{money(t.sgst)}</Info>
                  </>
                )}
                <Info label="Round Off">{money(t.roundOff)}</Info>
              </div>
              <div className="pd-net">
                <span>Grand Total</span>
                <strong>{money(t.grandTotal)}</strong>
              </div>
            </section>
          )}
        </div>

        <footer className="inv-footer">
          <span />
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="inv-btn-gold inv-btn-lg" onClick={onEdit}>
              <Icon name="edit" size={16} />
              {itemId ? 'Edit Item' : 'Edit Invoice'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default PurchaseInvoiceDetails;
