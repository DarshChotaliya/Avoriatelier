import { useEffect } from 'react';
import Icon from './Icon';
import PurchaseForm from './PurchaseForm';
import './PurchaseInvoice.css';

/** The Dev_g Diamond / Gold / Silver purchase form, shown as a dialog over the purchase list. */
function PurchaseItemModal({ purchaseId, onSaved, onClose }) {
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

  const title = purchaseId ? 'Edit Purchase' : 'New Purchase';

  return (
    <div className="inv-overlay">
      <div className="inv-modal pf-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="diamond" size={22} /></span>
          <div>
            <h2>{title}</h2>
            <p>Diamond, gold or silver purchase with GST</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="inv-body pf-body">
          <PurchaseForm key={purchaseId ?? 'new'} purchaseId={purchaseId} onSaved={onSaved} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}

export default PurchaseItemModal;
