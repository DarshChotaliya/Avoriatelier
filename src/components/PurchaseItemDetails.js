import { useEffect, useState } from 'react';
import Icon from './Icon';
import { purchaseApi } from '../api/purchaseApi';
import { formatAmount, formatWeight } from '../utils/purchaseCalc';
import './PurchaseInvoice.css';
import './PurchaseItemDetails.css';

const money = (v) => `₹${formatAmount(v)}`;
const grams = (v) => `${formatWeight(v)} g`;
const pct = (v) => `${v}%`;
const date = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

// Fields shown for each item, per purchase type: [key, label, format?]
const ITEM_FIELDS = {
  Diamond: {
    key: 'diamondItems',
    icon: 'diamond',
    fields: [
      ['packetLotNo', 'Packet / Lot No.'], ['shape', 'Shape'], ['sizeMm', 'Size (mm)'],
      ['carat', 'Carat', (v) => `${v} ct`],
      ['color', 'Color'], ['clarity', 'Clarity'], ['cut', 'Cut'], ['polish', 'Polish'], ['symmetry', 'Symmetry'],
      ['fluorescence', 'Fluorescence'], ['certificateLab', 'Certificate Lab'], ['certificateNo', 'Certificate No.'],
      ['certificateDate', 'Certificate Date', date],
      ['quantity', 'Quantity'], ['ratePerCarat', 'Rate / Carat', money], ['discountPercent', 'Discount', pct],
      ['avgWeight', 'Avg Wt / Diamond', (v) => `${v} ct`], ['avgPrice', 'Avg Pcs Prices / Diamond', money],
    ],
  },
  Gold: {
    key: 'goldItems',
    icon: 'coin',
    fields: [
      ['goldType', 'Gold Type'], ['purity', 'Purity'], ['grossWeight', 'Gross Wt', grams],
      ['netWeight', 'Net Wt', grams], ['chargeableWeight', 'Chargeable Wt', grams],
      ['ratePerGram', 'Rate / g', money], ['goldValue', 'Gold Value', money],
      ['otherCharges', 'Other', money],
    ],
  },
  Silver: {
    key: 'silverItems',
    icon: 'coin',
    fields: [
      ['silverType', 'Silver Type'], ['purity', 'Purity'], ['grossWeight', 'Gross Wt', grams],
      ['netWeight', 'Net Wt', grams], ['ratePerGram', 'Rate / g', money],
      ['silverValue', 'Silver Value', money], ['otherCharges', 'Other', money],
    ],
  },
};

function Info({ label, children }) {
  return (
    <div className="pd-info">
      <span>{label}</span>
      <strong>{children === '' || children == null ? '—' : children}</strong>
    </div>
  );
}

/** Read-only view of one Purchase Item (Dev_g) purchase, loaded from the API. */
function PurchaseItemDetails({ purchaseId, onEdit, onClose }) {
  const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    purchaseApi.get(purchaseId)
      .then((p) => !cancelled && setPurchase(p))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

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

  const config = purchase ? ITEM_FIELDS[purchase.purchaseType] : null;
  const items = purchase && config ? purchase[config.key] : [];
  const typeClass = purchase ? `sec-${purchase.purchaseType.toLowerCase()}` : '';

  return (
    <div className="inv-overlay">
      <div className="inv-modal pd-modal" role="dialog" aria-modal="true"
        aria-label={purchase ? `Purchase ${purchase.purchaseNo}` : 'Purchase details'}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="eye" size={22} /></span>
          <div>
            <h2>{purchase ? purchase.purchaseNo : 'Purchase details'}</h2>
            <p>{purchase ? `${date(purchase.purchaseDate)} · ${purchase.supplierName}` : 'Loading…'}</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          {!purchase && !error && <p className="muted">Loading…</p>}

          {purchase && (
            <>
              <section className="inv-card">
                <h3 className="inv-section-title">Purchase Details</h3>
                <div className="pd-grid">
                  <Info label="Purchase No.">{purchase.purchaseNo}</Info>
                  <Info label="Date">{date(purchase.purchaseDate)}</Info>
                  <Info label="Supplier">{purchase.supplierName}</Info>
                  <Info label="Vendor Invoice No.">{purchase.invoiceNo}</Info>
                  <Info label="Type">
                    <span className={`badge badge-${purchase.purchaseType.toLowerCase()}`}>
                      <Icon name={config?.icon ?? 'diamond'} size={12} className="badge-icon" /> {purchase.purchaseType}
                    </span>
                  </Info>
                  <Info label="Payment">{purchase.paymentType}</Info>
                  <Info label="Remarks">{purchase.remarks}</Info>
                </div>
              </section>

              <section className="inv-card">
                <h3 className="inv-section-title">
                  <Icon name={config?.icon ?? 'diamond'} size={14} className={`sec-icon ${typeClass}`} />
                  {' '}{purchase.purchaseType} Items ({items.length})
                </h3>
                {items.map((item, i) => (
                  <div key={item.id ?? i} className="pd-item">
                    <div className="pd-item-head">
                      <strong>Item {i + 1}</strong>
                      <span className="pd-amount">{money(item.amount)}</span>
                    </div>
                    <div className="pd-grid">
                      {config.fields.map(([key, label, format]) => (
                        <Info key={key} label={label}>
                          {item[key] === null || item[key] === '' ? null : format ? format(item[key]) : item[key]}
                        </Info>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="inv-card">
                <h3 className="inv-section-title">Tax &amp; Total</h3>
                <div className="pd-grid">
                  <Info label="Gross Amount">{money(purchase.grossAmount)}</Info>
                  <Info label="Discount">{money(purchase.discount)}</Info>
                  <Info label="Taxable Amount">{money(purchase.taxableAmount)}</Info>
                  {purchase.cgstAmount > 0 && <Info label={`CGST ${purchase.cgstPercent}%`}>{money(purchase.cgstAmount)}</Info>}
                  {purchase.sgstAmount > 0 && <Info label={`SGST ${purchase.sgstPercent}%`}>{money(purchase.sgstAmount)}</Info>}
                  {purchase.igstAmount > 0 && <Info label={`IGST ${purchase.igstPercent}%`}>{money(purchase.igstAmount)}</Info>}
                  <Info label="Round Off">{money(purchase.roundOff)}</Info>
                </div>
                <div className="pd-net">
                  <span>Net Purchase Amount</span>
                  <strong>{money(purchase.netPurchaseAmount)}</strong>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="inv-footer">
          <span />
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {purchase && (
              <button type="button" className="inv-btn-gold inv-btn-lg" onClick={() => onEdit(purchase.id)}>
                <Icon name="edit" size={16} />
                Edit
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default PurchaseItemDetails;
