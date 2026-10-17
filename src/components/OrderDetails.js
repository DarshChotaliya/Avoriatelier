import { useEffect } from 'react';
import Icon from './Icon';
import PhotoThumb from './PhotoThumb';
import { calcQuoteLine } from '../utils/quotationCalc';
import { formatAmount, money as round, num } from '../utils/purchaseCalc';
import './PurchaseInvoice.css';
import './PurchaseItemDetails.css';
import './Orders.css';

const rupees = (v) => `₹${formatAmount(v)}`;
const date = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');
const statusClass = (s) => `od-status od-${s.toLowerCase().replace(/\s+/g, '-')}`;

function Info({ label, children }) {
  return (
    <div className="pd-info">
      <span>{label}</span>
      <strong>{children === '' || children == null ? '—' : children}</strong>
    </div>
  );
}

/**
 * Everything about one order: the customer, the piece, the dates, the money (agreed amount, advance, balance),
 * the quotation it came from with its lines, and the sales invoice once it is billed.
 */
function OrderDetails({ order, quotation, invoiceNo, canEdit = true, onEdit, onInvoice, onClose }) {
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

  const amount = num(order.amount);
  const advance = num(order.advance);
  const balance = round(amount - advance);
  const canBill = canEdit && order.status === 'Delivered' && !invoiceNo && onInvoice;

  return (
    <div className="inv-overlay">
      <div className="inv-modal pd-modal pd-wide" role="dialog" aria-modal="true" aria-label={`Order ${order.orderNo}`}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="eye" size={22} /></span>
          <div>
            <h2>Order {order.orderNo}</h2>
            <p>{order.clientName}{order.contactNo ? ` · ${order.contactNo}` : ''}</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="inv-body">
          <section className="inv-card">
            <h3 className="inv-section-title">Order</h3>
            <div className="pdi-top">
              {order.photo
                ? <PhotoThumb src={order.photo} title={order.orderNo} className="pdi-photo" />
                : <span className="pdi-photo pdi-photo-empty"><Icon name="camera" size={22} /></span>}
              <div className="pd-grid">
                <Info label="Status"><span className={statusClass(order.status)}>{order.status}</span></Info>
                <Info label="Branch">{order.branch}</Info>
                <Info label="Client">{order.clientName}</Info>
                <Info label="Contact">{order.contactNo}</Info>
                <Info label="Piece">{order.description}</Info>
                <Info label="Design / SKU">{order.designRef}</Info>
                <Info label="Metal">{order.metalType}</Info>
                <Info label="Diamond">{order.diamondType}</Info>
                <Info label="Qty">{order.qty}</Info>
                <Info label="Manufacturer">{order.manufacturer}</Info>
                <Info label="Quotation">{order.quotationNo}</Info>
                <Info label="Sales Invoice">{invoiceNo}</Info>
              </div>
            </div>
          </section>

          <section className="inv-card">
            <h3 className="inv-section-title">Dates</h3>
            <div className="pd-grid">
              <Info label="Ordered">{date(order.clientOrderDate)}</Info>
              <Info label="Order Placed">{date(order.orderPlacedDate)}</Info>
              <Info label="CAD Confirmed">{date(order.cadConfirmedDate)}</Info>
              <Info label="Delivery Date">{date(order.deliveryDate)}</Info>
              <Info label="Completed">{date(order.completedDate)}</Info>
            </div>
          </section>

          <section className="inv-card">
            <h3 className="inv-section-title">Amount</h3>
            <div className="pd-grid">
              <Info label="Agreed Amount">{amount > 0 ? rupees(amount) : null}</Info>
              <Info label="Advance Paid">{rupees(advance)}</Info>
              <Info label="Balance">{amount > 0 ? rupees(balance) : null}</Info>
            </div>
          </section>

          {quotation?.lines?.length > 0 && (
            <section className="inv-card">
              <h3 className="inv-section-title">From quotation {quotation.quotationNo}</h3>
              <table className="pdi-table">
                <thead>
                  <tr>
                    <th>Design</th>
                    <th>Metal</th>
                    <th className="num">Weight (g)</th>
                    <th className="num">Qty</th>
                    <th className="num">Total (with GST)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.lines.map((l, i) => (
                    // Quotation lines are edited as a list, so the position is their identity.
                    <tr key={i}>
                      <td>{l.isCustom ? [l.category, l.size, l.description].filter(Boolean).join(' · ') || 'Custom design'
                        : l.description || l.skuNo}</td>
                      <td>{l.toMetal}</td>
                      <td className="num mono">{l.weight}</td>
                      <td className="num mono">{l.qty}</td>
                      <td className="num mono">{rupees(calcQuoteLine(l).total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {order.notes && (
            <section className="inv-card">
              <h3 className="inv-section-title">Notes</h3>
              <p className="od-notes">{order.notes}</p>
            </section>
          )}
        </div>

        <footer className="inv-footer">
          <span />
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {canBill && (
              <button type="button" className="od-bill-btn od-bill-lg" onClick={onInvoice}>
                <Icon name="receipt" size={16} />
                Make Sales Invoice
              </button>
            )}
            {canEdit && onEdit && (
              <button type="button" className="inv-btn-gold inv-btn-lg" onClick={onEdit}>
                <Icon name="edit" size={16} />
                Edit Order
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default OrderDetails;
